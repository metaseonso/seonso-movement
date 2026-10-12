import { describe, expect, it } from "vitest";
import { route, type Env } from "../src/index";
import { sign, type Row } from "../src/meta";
import type { Store } from "../src/store";

class MemoryStore implements Store {
  rows = new Map<string, Row>();
  failNext = false;
  async append(rows: Row[]): Promise<number> {
    if (this.failNext) {
      this.failNext = false;
      throw new Error("D1 unavailable");
    }
    let added = 0;
    for (const r of rows) {
      const key = `${r.channel}|${r.kind}|${r.external_id}`;
      if (!this.rows.has(key)) {
        this.rows.set(key, r);
        added++;
      }
    }
    return added;
  }
  async count() {
    return this.rows.size;
  }
}

const env: Env = {
  DB: undefined as unknown as D1Database,
  META_VERIFY_TOKEN: "verify-me",
  META_APP_SECRET: "meta-secret",
  INSTAGRAM_APP_SECRET: "ig-secret",
  PRIVACY_CONTACT_EMAIL: "hello@example.com",
};

const BASE = "https://bcb-desk.example.workers.dev";

async function post(body: unknown, store: Store, secret = "meta-secret", e: Env = env) {
  const raw = JSON.stringify(body);
  return route(
    new Request(`${BASE}/meta/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-hub-signature-256": await sign(secret, raw) },
      body: raw,
    }),
    e,
    store,
  );
}

const whatsappText = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "WABA_ID",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: { display_phone_number: "6281234567890", phone_number_id: "PNID" },
            contacts: [{ profile: { name: "Made" }, wa_id: "6281111111111" }],
            messages: [
              { from: "6281111111111", id: "wamid.TEXT1", timestamp: "1760000000", type: "text", text: { body: "Hi, quote for a bamboo pavilion?" } },
              { from: "6281111111111", id: "wamid.IMG1", timestamp: "1760000005", type: "image", image: { id: "MEDIA1", mime_type: "image/jpeg", sha256: "abc", caption: "site photo" } },
            ],
          },
        },
      ],
    },
  ],
};

const instagramDm = {
  object: "instagram",
  entry: [
    {
      id: "IG_ACCOUNT",
      time: 1760000000000,
      messaging: [
        { sender: { id: "IGSID_1" }, recipient: { id: "IG_ACCOUNT" }, timestamp: 1760000000000, message: { mid: "mid.1", text: "Do you ship to Jakarta?" } },
        { sender: { id: "IGSID_1" }, recipient: { id: "IG_ACCOUNT" }, timestamp: 1760000001000, message: { mid: "mid.2", attachments: [{ type: "image", payload: { url: "https://cdn.example/x.jpg" } }] } },
        { sender: { id: "IG_ACCOUNT" }, recipient: { id: "IGSID_1" }, timestamp: 1760000002000, message: { mid: "mid.3", text: "Yes!", is_echo: true } },
        { sender: { id: "IGSID_1" }, recipient: { id: "IG_ACCOUNT" }, timestamp: 1760000003000, read: { mid: "mid.3" } },
      ],
    },
  ],
};

describe("GET /meta/webhook (Meta's verification handshake)", () => {
  const get = (q: string, e: Env = env) => route(new Request(`${BASE}/meta/webhook?${q}`), e, new MemoryStore());

  it("echoes the challenge when the token matches", async () => {
    const res = await get("hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=1158201444");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("1158201444");
  });

  it("refuses a wrong token", async () => {
    const res = await get("hub.mode=subscribe&hub.verify_token=nope&hub.challenge=1");
    expect(res.status).toBe(403);
  });

  it("fails loudly when the verify token is not configured", async () => {
    const res = await get("hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=1", { ...env, META_VERIFY_TOKEN: undefined });
    expect(res.status).toBe(500);
    expect(await res.text()).toMatch(/META_VERIFY_TOKEN/);
  });
});

describe("POST /meta/webhook", () => {
  it("rejects a bad signature and stores nothing", async () => {
    const store = new MemoryStore();
    const res = await post(whatsappText, store, "wrong-secret");
    expect(res.status).toBe(401);
    expect(store.rows.size).toBe(0);
  });

  it("rejects a missing signature", async () => {
    const store = new MemoryStore();
    const res = await route(new Request(`${BASE}/meta/webhook`, { method: "POST", body: "{}" }), env, store);
    expect(res.status).toBe(401);
  });

  it("stores WhatsApp text and image messages with sender name and media", async () => {
    const store = new MemoryStore();
    const res = await post(whatsappText, store);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: 2, added: 2 });

    const text = store.rows.get("whatsapp|message|wamid.TEXT1")!;
    expect(text).toMatchObject({ sender_id: "6281111111111", sender_name: "Made", account_id: "PNID", type: "text", text: "Hi, quote for a bamboo pavilion?", sent_at: 1760000000000 });

    const img = store.rows.get("whatsapp|message|wamid.IMG1")!;
    expect(img.media).toEqual([{ type: "image", id: "MEDIA1", mime_type: "image/jpeg", sha256: "abc", caption: "site photo" }]);
    expect(img.text).toBe("site photo");
  });

  it("absorbs Meta's retries: the same delivery twice adds nothing the second time", async () => {
    const store = new MemoryStore();
    await post(whatsappText, store);
    const again = await post(whatsappText, store);
    expect(await again.json()).toEqual({ received: 2, added: 0 });
    expect(store.rows.size).toBe(2);
  });

  it("stores WhatsApp delivery statuses", async () => {
    const store = new MemoryStore();
    const body = {
      object: "whatsapp_business_account",
      entry: [{ id: "W", changes: [{ field: "messages", value: { metadata: { phone_number_id: "PNID" }, statuses: [{ id: "wamid.OUT1", status: "delivered", timestamp: "1760000100", recipient_id: "6281111111111" }] } }] }],
    };
    await post(body, store);
    expect(store.rows.get("whatsapp|status|wamid.OUT1:delivered")).toMatchObject({ type: "delivered", sender_id: "6281111111111" });
  });

  it("accepts Instagram deliveries signed with the Instagram app secret", async () => {
    const store = new MemoryStore();
    const res = await post(instagramDm, store, "ig-secret");
    expect(res.status).toBe(200);
    expect(store.rows.get("instagram|message|mid.1")).toMatchObject({ sender_id: "IGSID_1", account_id: "IG_ACCOUNT", text: "Do you ship to Jakarta?", type: "text" });
    expect(store.rows.get("instagram|message|mid.2")!.media).toEqual([{ type: "image", url: "https://cdn.example/x.jpg" }]);
    expect(store.rows.get("instagram|echo|mid.3")).toMatchObject({ text: "Yes!" });
  });

  it("keeps events it does not recognise instead of dropping them", async () => {
    const store = new MemoryStore();
    await post(instagramDm, store, "ig-secret");
    const unknown = [...store.rows.values()].filter((r) => r.kind === "unknown");
    expect(unknown).toHaveLength(1);
    expect(unknown[0].type).toBe("read");

    const other = new MemoryStore();
    await post({ object: "page", entry: [] }, other);
    expect([...other.rows.values()]).toMatchObject([{ channel: "unknown", kind: "unknown", type: "page" }]);
  });

  it("returns 500 when storage fails so Meta retries", async () => {
    const store = new MemoryStore();
    store.failNext = true;
    const res = await post(whatsappText, store);
    expect(res.status).toBe(500);
    const retry = await post(whatsappText, store);
    expect(retry.status).toBe(200);
    expect(store.rows.size).toBe(2);
  });

  it("fails loudly when no app secret is configured", async () => {
    const res = await post(whatsappText, new MemoryStore(), "meta-secret", { ...env, META_APP_SECRET: undefined, INSTAGRAM_APP_SECRET: undefined });
    expect(res.status).toBe(500);
  });
});

describe("other routes", () => {
  it("/health reports the count and which settings are present", async () => {
    const res = await route(new Request(`${BASE}/health`), env, new MemoryStore());
    expect(await res.json()).toEqual({
      ok: true,
      messages: 0,
      configured: { verify_token: true, meta_app_secret: true, instagram_app_secret: true, privacy_contact: true },
    });
  });

  it("/privacy serves the policy with the contact address escaped", async () => {
    const res = await route(new Request(`${BASE}/privacy`), { ...env, PRIVACY_CONTACT_EMAIL: "a<b@example.com" }, new MemoryStore());
    const html = await res.text();
    expect(res.headers.get("content-type")).toMatch(/text\/html/);
    expect(html).toContain("a&lt;b@example.com");
    expect(html).not.toContain("a<b@example.com");
  });
});
