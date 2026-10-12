# bcb-desk

Cloudflare Worker that receives WhatsApp and Instagram messages from Meta and appends them to a D1 database.

| Route | What |
|---|---|
| `GET /meta/webhook` | Meta's verification handshake (`hub.verify_token` must equal `META_VERIFY_TOKEN`) |
| `POST /meta/webhook` | Meta deliveries. Signature checked against `META_APP_SECRET` / `INSTAGRAM_APP_SECRET`; rows appended to `messages`; duplicates ignored; storage failure returns 500 so Meta retries |
| `GET /health` | Message count and which settings are present |
| `GET /privacy` | Privacy policy page for the Meta app settings |

Table `messages` (created on first request, `src/store.ts`): one row per message, echo, delivery status or unrecognised event, unique on `(channel, kind, external_id)`. Never updated or deleted.

## Deploy (once)

1. Cloudflare dashboard → **Storage & Databases → D1 → Create**, name `bcb-desk`. Put its ID in `wrangler.jsonc` (`database_id`).
2. **Workers & Pages → Create → Import a repository** → this repo, root directory `bcb-desk`. Deploy.
3. The Worker → **Settings → Variables and Secrets**, add as secrets:

| Name | Value |
|---|---|
| `META_VERIFY_TOKEN` | any long random string |
| `META_APP_SECRET` | Meta app → App settings → Basic → App secret |
| `INSTAGRAM_APP_SECRET` | Meta app → Instagram → API setup with Instagram login → Instagram app secret |
| `PRIVACY_CONTACT_EMAIL` | address for data requests |

4. Open `https://bcb-desk.<account>.workers.dev/health` — every `configured` value should be `true`.
5. Meta app → WhatsApp → Configuration → Webhook: callback `https://bcb-desk.<account>.workers.dev/meta/webhook`, verify token = `META_VERIFY_TOKEN`, subscribe `messages`. Same URL and token under Instagram → Webhooks.
6. Meta app → App settings → Basic → Privacy policy URL: `https://bcb-desk.<account>.workers.dev/privacy`.

## Develop

```
npm install
npm test            # unit tests (no Cloudflare account needed)
npm run typecheck
npx wrangler dev    # local Worker + local D1; secrets from .dev.vars (gitignored)
```
