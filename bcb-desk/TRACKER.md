# BCB desk — tracker

The order of work for BCB's inbound messages. Each step names who does it and what "done" means. Update the box when a step is done; add the date.

**Resume in a new session:** "Read `bcb-desk/TRACKER.md` and continue from the first open step."

Legend: `[ ]` open · `[x]` done · **You** = owner, in a browser · **Claude** = in a session

## Decisions

| # | Decision | Status |
|---|---|---|
| D1 | Cloudflare account is BCB's own, on a BCB email, owner added as admin | decided 2026-10-12 |
| D2 | Code lives in its own repo (name: ____ ) | decided 2026-10-12, repo not created |
| D3 | Global key for setup only, then scoped token; global key rolled | decided 2026-10-12 |
| D4 | WhatsApp number: new SIM for the API, current number stays on the Business app | proposed |
| D5 | Google: Workspace or regular @gmail.com | open |
| D6 | Website: stay on WordPress.com (Claude via MCP) or move to Cloudflare Pages | open |

## A. Accounts — You

- [ ] A1 Cloudflare account for BCB (D1)
- [ ] A2 Empty private GitHub repo for the desk (D2) — send Claude the name
- [ ] A3 Environment settings (title bar → environment → Edit): `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_EMAIL`, `CLOUDFLARE_API_KEY` (global). Then start a new session.
- [ ] A4 Meta business portfolio for BCB at business.facebook.com
- [ ] A5 Start Meta business verification (Security Center). Slowest step — Instagram messages need it, and it raises the WhatsApp number cap from 2 to 20.
- [ ] A6 Get the WhatsApp SIM (D4)

## B. Webhook live — Claude (needs A1–A3)

- [ ] B1 Run `scripts/setup.sh`: D1 database, deploy, verify token. Done = `/health` answers, webhook and privacy URLs written here.
- [ ] B2 Move `bcb-desk` into the repo from A2; commit history kept
- [ ] B3 You create the scoped token; swap env (`CLOUDFLARE_API_TOKEN` in, global key and email out); roll the global key. Done = Claude's `wrangler whoami` works on the scoped token.

Webhook URL: ____ · Privacy URL: ____ · Verify token: given once in the session that ran B1

## C. WhatsApp — You in Meta, Claude checks (needs B1)

- [ ] C1 developers.facebook.com → Create App → "Connect with customers through WhatsApp" → BCB portfolio → Start using the API
- [ ] C2 Meta app → WhatsApp → Configuration → Webhook: paste webhook URL + verify token, subscribe `messages`. Done = Meta shows it verified.
- [ ] C3 Copy App secret (App settings → Basic) into Cloudflare dashboard → Worker `bcb-desk` → Settings → Variables and Secrets → `META_APP_SECRET`. Done = `/health` shows `meta_app_secret: true`.
- [ ] C4 Send a test message from Meta's test number to your phone, reply to it. Done = Claude sees the reply in D1.
- [ ] C5 Add the real number (A6): SMS/voice code, display name "Bamboo Creative Bali"
- [ ] C6 Permanent token: Business Settings → System users → full control of app + WhatsApp account → token with `business_management`, `whatsapp_business_messaging`, `whatsapp_business_management` → Worker secret `WHATSAPP_TOKEN`
- [ ] C7 Claude: sending replies (endpoint + test). Done = a reply typed in the desk arrives on a phone.

## D. Instagram — You in Meta, Claude builds (needs C1, A5 for real DMs)

- [ ] D1 Instagram switched to a professional account
- [ ] D2 Same Meta app → add Instagram → "API setup with Instagram login" → log in → `instagram_business_basic`, `instagram_business_manage_messages`
- [ ] D3 Instagram app secret → Worker secret `INSTAGRAM_APP_SECRET`; webhook (same URL + token), subscribe `messages`
- [ ] D4 Privacy policy URL in App settings → Basic; app switched to Live
- [ ] D5 Claude: subscribe the account (`/me/subscribed_apps`), store the token, renew it before its 60 days run out
- [ ] D6 A DM from a non-team account appears in D1

## E. The desk — Claude (needs C4)

- [ ] E1 Dashboard on Cloudflare: cases from all channels, draft, approve, send
- [ ] E2 Team login (Cloudflare Access)
- [ ] E3 Countdown on each chat until its 24-hour window closes
- [ ] E4 `desk.<domain>` subdomain (one DNS record, no domain move)

## F. Later channels

- [ ] F1 Gmail in/out (after D5)
- [ ] F2 Trello cards in, replies move cards
- [ ] F3 Telegram (team receipts group, customer chats)
- [ ] F4 Website contact form → desk (after D6)
- [ ] F5 Receipts and photos for accounting
- [ ] F6 AI drafts

## Log

- 2026-10-12 Webhook code written and tested (14 unit tests, local end-to-end with D1). `scripts/setup.sh` ready. Nothing deployed.
