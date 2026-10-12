// Meta webhook handling for WhatsApp Cloud API and Instagram messaging:
// signature check and payload → normalized rows.

export type Channel = "whatsapp" | "instagram" | "unknown";
export type Kind = "message" | "echo" | "status" | "unknown";

export interface Media {
  type: string;
  id?: string; // WhatsApp media id (download via Graph API)
  url?: string; // Instagram attachment URL
  mime_type?: string;
  sha256?: string;
  caption?: string;
}

export interface Row {
  channel: Channel;
  kind: Kind;
  external_id: string;
  account_id: string | null;
  sender_id: string | null;
  sender_name: string | null;
  sent_at: number | null; // ms since epoch, platform-reported
  type: string | null;
  text: string | null;
  media: Media[];
  raw: unknown;
}

const encoder = new TextEncoder();

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function sign(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return "sha256=" + hex(await crypto.subtle.sign("HMAC", key, encoder.encode(body)));
}

/** True when X-Hub-Signature-256 matches the body under any of the given secrets. */
export async function verifySignature(
  header: string | null,
  body: string,
  secrets: string[],
): Promise<boolean> {
  if (!header) return false;
  for (const secret of secrets) {
    if (timingSafeEqual(header, await sign(secret, body))) return true;
  }
  return false;
}

export async function sha256(text: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", encoder.encode(text)));
}

const tsSeconds = (v: unknown): number | null => (v == null ? null : Number(v) * 1000);
const tsMillis = (v: unknown): number | null => (v == null ? null : Number(v));

const WA_MEDIA = ["image", "video", "audio", "document", "sticker"] as const;

function unknownRow(channel: Channel, type: string, hash: string, raw: unknown): Row {
  return {
    channel,
    kind: "unknown",
    external_id: hash,
    account_id: null,
    sender_id: null,
    sender_name: null,
    sent_at: null,
    type,
    text: null,
    media: [],
    raw,
  };
}

async function whatsappRows(payload: any): Promise<Row[]> {
  const rows: Row[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      const accountId: string | null = value.metadata?.phone_number_id ?? null;
      if (!value.messages && !value.statuses) {
        rows.push(unknownRow("whatsapp", String(change.field ?? "change"), await sha256(JSON.stringify(change)), change));
        continue;
      }
      const names = new Map<string, string>();
      for (const c of value.contacts ?? []) names.set(c.wa_id, c.profile?.name);

      for (const m of value.messages ?? []) {
        const media: Media[] = [];
        for (const t of WA_MEDIA) {
          if (m[t]) media.push({ type: t, id: m[t].id, mime_type: m[t].mime_type, sha256: m[t].sha256, caption: m[t].caption });
        }
        rows.push({
          channel: "whatsapp",
          kind: "message",
          external_id: m.id,
          account_id: accountId,
          sender_id: m.from ?? null,
          sender_name: names.get(m.from) ?? null,
          sent_at: tsSeconds(m.timestamp),
          type: m.type ?? null,
          text: m.text?.body ?? media.find((x) => x.caption)?.caption ?? null,
          media,
          raw: m,
        });
      }

      for (const s of value.statuses ?? []) {
        rows.push({
          channel: "whatsapp",
          kind: "status",
          external_id: `${s.id}:${s.status}`,
          account_id: accountId,
          sender_id: s.recipient_id ?? null,
          sender_name: null,
          sent_at: tsSeconds(s.timestamp),
          type: s.status ?? null,
          text: s.errors ? JSON.stringify(s.errors) : null,
          media: [],
          raw: s,
        });
      }
    }
  }
  return rows;
}

async function instagramRows(payload: any): Promise<Row[]> {
  const rows: Row[] = [];
  for (const entry of payload.entry ?? []) {
    const accountId: string | null = entry.id ?? null;
    for (const ev of entry.messaging ?? []) {
      const msg = ev.message;
      if (!msg?.mid) {
        // reads, reactions, postbacks: kept whole, keyed by content hash
        rows.push(unknownRow("instagram", Object.keys(ev).filter((k) => !["sender", "recipient", "timestamp"].includes(k)).join(",") || "event", await sha256(JSON.stringify(ev)), ev));
        continue;
      }
      const media: Media[] = (msg.attachments ?? []).map((a: any) => ({ type: a.type, url: a.payload?.url }));
      rows.push({
        channel: "instagram",
        kind: msg.is_echo ? "echo" : "message",
        external_id: msg.mid,
        account_id: accountId,
        sender_id: ev.sender?.id ?? null,
        sender_name: null,
        sent_at: tsMillis(ev.timestamp),
        type: media.length ? media[0].type : "text",
        text: msg.text ?? null,
        media,
        raw: ev,
      });
    }
  }
  return rows;
}

/**
 * Turn a webhook body into rows. Anything this code does not recognise is
 * kept whole as an "unknown" row keyed by a content hash, so nothing Meta
 * sends is dropped.
 */
export async function toRows(body: string): Promise<Row[]> {
  const payload = JSON.parse(body);
  let rows: Row[] = [];
  if (payload.object === "whatsapp_business_account") rows = await whatsappRows(payload);
  else if (payload.object === "instagram") rows = await instagramRows(payload);
  if (rows.length === 0) rows.push(unknownRow("unknown", String(payload.object ?? "none"), await sha256(body), payload));
  return rows;
}
