// Append-only message log in D1. Rows are inserted, never updated or
// deleted; Meta's retries are absorbed by the unique key.

import type { Row } from "./meta";

export interface Store {
  /** Insert rows; returns how many were new (duplicates are ignored). */
  append(rows: Row[], receivedAt: number): Promise<number>;
  count(): Promise<number>;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    received_at INTEGER NOT NULL,
    channel     TEXT NOT NULL,
    kind        TEXT NOT NULL,
    external_id TEXT NOT NULL,
    account_id  TEXT,
    sender_id   TEXT,
    sender_name TEXT,
    sent_at     INTEGER,
    type        TEXT,
    text        TEXT,
    media       TEXT NOT NULL,
    raw         TEXT NOT NULL,
    UNIQUE (channel, kind, external_id)
  )`,
  `CREATE INDEX IF NOT EXISTS messages_by_sender ON messages (channel, sender_id, received_at)`,
];

const INSERT = `INSERT OR IGNORE INTO messages
  (received_at, channel, kind, external_id, account_id, sender_id, sender_name, sent_at, type, text, media, raw)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

export class D1Store implements Store {
  private ready: Promise<void> | null = null;

  constructor(private db: D1Database) {}

  private ensureSchema(): Promise<void> {
    if (!this.ready) {
      this.ready = this.db
        .batch(SCHEMA.map((sql) => this.db.prepare(sql)))
        .then(() => undefined)
        .catch((err) => {
          this.ready = null; // retry on the next request rather than caching a failure
          throw err;
        });
    }
    return this.ready;
  }

  async append(rows: Row[], receivedAt: number): Promise<number> {
    await this.ensureSchema();
    const results = await this.db.batch(
      rows.map((r) =>
        this.db
          .prepare(INSERT)
          .bind(
            receivedAt,
            r.channel,
            r.kind,
            r.external_id,
            r.account_id,
            r.sender_id,
            r.sender_name,
            r.sent_at,
            r.type,
            r.text,
            JSON.stringify(r.media),
            JSON.stringify(r.raw),
          ),
      ),
    );
    return results.reduce((n, res) => n + (res.meta.changes ?? 0), 0);
  }

  async count(): Promise<number> {
    await this.ensureSchema();
    const row = await this.db.prepare("SELECT count(*) AS n FROM messages").first<{ n: number }>();
    return row?.n ?? 0;
  }
}
