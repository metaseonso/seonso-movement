# BCB desk — tracker

Strategy (2026-10-12): BCB processes every lead in its own channel. WhatsApp and Instagram are signposts only — they point people to one link and are never integrated. No Meta APIs.

**Resume in a new session:** "Read `bcb-desk/TRACKER.md` and continue from the first open step."

Legend: `[ ]` open · `[x]` done · **You** = owner, in a browser or phone · **Claude** = in a session

## The shape

| Part | What | Where |
|---|---|---|
| The link | One short address on BCB's domain, e.g. `start.<domain>` | everywhere: IG bio, WA profile, auto-replies, website buttons, ads |
| Start page | Short form: name, email, phone (optional), project type, location, budget range, timeline, photos | Cloudflare Pages + Worker |
| Thread | Each lead gets a private conversation page (link by email). Text + photos both ways | Worker + D1 + R2 |
| Notifications | Client: email with the thread link on every reply. Team: email/Telegram on every new lead or message | Gmail API (free) |
| Desk | Team inbox + pipeline: New → Qualified → Call/visit → Proposal → Won/Lost (reason) | Cloudflare, behind Cloudflare Access |
| Claude | Drafts replies, daily "who is waiting / who needs follow-up" | later |

## Decisions

| # | Decision | Status |
|---|---|---|
| D1 | Cloudflare account is BCB's own, on a BCB email, owner as admin | decided 2026-10-12 |
| D2 | Code in its own repo (name: ____ ) | decided 2026-10-12, repo not created |
| D3 | One scoped Cloudflare token (no global key) | decided 2026-10-12 |
| D4 | No WhatsApp/Instagram integration; signposts only | decided 2026-10-12 |
| D5 | Client notification email sent from: Workspace or @gmail.com account | open |
| D6 | Website: stays on WordPress.com; the link and buttons point to the start page | proposed |

## A. Accounts — You

- [ ] A1 Cloudflare account for BCB (D1)
- [ ] A2 Empty private GitHub repo (D2) — send Claude the name
- [ ] A3 Scoped Cloudflare token (Workers Scripts, D1, Pages, R2, Access, Account Settings — Edit). Environment settings: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`. New session.

## B. Signposts — You, 15 minutes, no code (can happen now with a temporary link)

- [ ] B1 WhatsApp Business app → Business tools → Greeting message + Away message: "Thanks for reaching out to Bamboo Creative Bali! To get your project started and quoted, tell us about it here: <link>"
- [ ] B2 WhatsApp Business app → Quick replies: `/start` = the same message
- [ ] B3 WhatsApp profile → website = the link
- [ ] B4 Instagram bio link = the link
- [ ] B5 Meta Business Suite → Inbox → Automations → Auto reply (Instagram) = the same message
- [ ] B6 Website: every "Contact" button points to the link

## C. Build — Claude (needs A1–A3)

- [ ] C1 Start page + intake: lead stored, thread created, confirmation shown. Done = a test lead appears in D1 with photos in R2.
- [ ] C2 Thread page: client and team messages, photo upload, private link
- [ ] C3 Desk: inbox, pipeline stages, lost reason, next action + date per lead; Cloudflare Access login
- [ ] C4 Notifications: Gmail API (one login, D5) — client gets thread link on each reply; team alerted on new lead/message
- [ ] C5 `start.<domain>` and `desk.<domain>`: one DNS record each at WordPress.com, no domain move
- [ ] C6 Claude: draft replies + daily follow-up list

## Parked

- Meta webhook (`src/meta.ts`, `/meta/webhook`): built and tested 2026-10-12, not deployed. Parked by D4.

## Log

- 2026-10-12 Webhook code written and tested. `scripts/setup.sh` ready. Nothing deployed.
- 2026-10-12 Strategy changed to own-channel; Meta integration parked.
