import { toRows, verifySignature } from "./meta";
import { D1Store, type Store } from "./store";
import { privacyPage } from "./privacy";

export interface Env {
  DB: D1Database;
  META_VERIFY_TOKEN?: string;
  META_APP_SECRET?: string;
  INSTAGRAM_APP_SECRET?: string;
  PRIVACY_CONTACT_EMAIL?: string;
}

const text = (body: string, status = 200) =>
  new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8" } });
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** Meta's GET verification handshake. */
export function verifyHandshake(url: URL, env: Env): Response {
  if (!env.META_VERIFY_TOKEN) return text("META_VERIFY_TOKEN is not set on this Worker", 500);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === env.META_VERIFY_TOKEN && challenge) return text(challenge);
  return text("verification failed", 403);
}

/** Meta's POST delivery: verify the signature, store, then 200. A storage failure returns 500 so Meta retries. */
export async function receive(request: Request, env: Env, store: Store): Promise<Response> {
  const secrets = [env.META_APP_SECRET, env.INSTAGRAM_APP_SECRET].filter((s): s is string => !!s);
  if (secrets.length === 0) return text("META_APP_SECRET is not set on this Worker", 500);

  const body = await request.text();
  if (!(await verifySignature(request.headers.get("x-hub-signature-256"), body, secrets))) {
    return text("bad signature", 401);
  }

  let rows;
  try {
    rows = await toRows(body);
  } catch (err) {
    return text(`body is not JSON: ${(err as Error).message}`, 400);
  }

  try {
    const added = await store.append(rows, Date.now());
    return json({ received: rows.length, added });
  } catch (err) {
    console.error("store.append failed", err);
    return text(`storage failed: ${(err as Error).message}`, 500);
  }
}

export async function route(request: Request, env: Env, store: Store): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/meta/webhook") {
    if (request.method === "GET") return verifyHandshake(url, env);
    if (request.method === "POST") return receive(request, env, store);
    return text("method not allowed", 405);
  }

  if (url.pathname === "/health" && request.method === "GET") {
    const configured = {
      verify_token: !!env.META_VERIFY_TOKEN,
      meta_app_secret: !!env.META_APP_SECRET,
      instagram_app_secret: !!env.INSTAGRAM_APP_SECRET,
      privacy_contact: !!env.PRIVACY_CONTACT_EMAIL,
    };
    try {
      return json({ ok: true, messages: await store.count(), configured });
    } catch (err) {
      return json({ ok: false, error: (err as Error).message, configured }, 500);
    }
  }

  if (url.pathname === "/privacy" && request.method === "GET") {
    if (!env.PRIVACY_CONTACT_EMAIL) return text("PRIVACY_CONTACT_EMAIL is not set on this Worker", 500);
    return new Response(privacyPage(env.PRIVACY_CONTACT_EMAIL), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  return text("not found", 404);
}

// One store per isolate, so the schema check runs once rather than per request.
let store: D1Store | null = null;
let storeDb: D1Database | null = null;

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    if (!store || storeDb !== env.DB) {
      store = new D1Store(env.DB);
      storeDb = env.DB;
    }
    return route(request, env, store);
  },
} satisfies ExportedHandler<Env>;
