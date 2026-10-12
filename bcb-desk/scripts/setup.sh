#!/usr/bin/env bash
# One-time setup of bcb-desk on a Cloudflare account. Safe to re-run.
#
# Auth (from the environment, never typed here):
#   CLOUDFLARE_ACCOUNT_ID                         required
#   CLOUDFLARE_API_TOKEN                          scoped token, or
#   CLOUDFLARE_API_KEY + CLOUDFLARE_EMAIL         global key
# Worker secrets, pushed if present in the environment:
#   META_APP_SECRET  INSTAGRAM_APP_SECRET  PRIVACY_CONTACT_EMAIL  META_VERIFY_TOKEN
set -euo pipefail
cd "$(dirname "$0")/.."

fail() { echo "setup: $*" >&2; exit 1; }

[ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ] || fail "CLOUDFLARE_ACCOUNT_ID is not set"
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ] && { [ -z "${CLOUDFLARE_API_KEY:-}" ] || [ -z "${CLOUDFLARE_EMAIL:-}" ]; }; then
  fail "set CLOUDFLARE_API_TOKEN, or CLOUDFLARE_API_KEY and CLOUDFLARE_EMAIL"
fi
[ -d node_modules ] || npm install --no-audit --no-fund

echo "== 1. auth"
npx wrangler whoami

echo "== 2. D1 database bcb-desk"
DB_ID=$(npx wrangler d1 list --json | node -e 'const l=JSON.parse(require("fs").readFileSync(0,"utf8"));const d=l.find(x=>x.name==="bcb-desk");process.stdout.write(d?d.uuid:"")')
if [ -z "$DB_ID" ]; then
  npx wrangler d1 create bcb-desk >/dev/null
  DB_ID=$(npx wrangler d1 list --json | node -e 'const l=JSON.parse(require("fs").readFileSync(0,"utf8"));const d=l.find(x=>x.name==="bcb-desk");process.stdout.write(d?d.uuid:"")')
fi
[ -n "$DB_ID" ] || fail "could not create or find the D1 database"
echo "database_id $DB_ID"
node -e '
  const fs=require("fs"); const p="wrangler.jsonc"; const id=process.argv[1];
  const s=fs.readFileSync(p,"utf8").replace(/"database_id":\s*"[^"]*"/, `"database_id": "${id}"`);
  fs.writeFileSync(p,s);' "$DB_ID"

echo "== 3. deploy"
DEPLOY_OUT=$(npx wrangler deploy 2>&1) || { echo "$DEPLOY_OUT"; fail "deploy failed"; }
echo "$DEPLOY_OUT" | tail -5
URL=$(echo "$DEPLOY_OUT" | grep -oE 'https://[a-z0-9.-]+\.workers\.dev' | head -1)
[ -n "$URL" ] || fail "deploy output has no workers.dev URL"

echo "== 4. secrets"
put() { printf '%s' "$2" | npx wrangler secret put "$1" >/dev/null && echo "set $1"; }
if [ -z "${META_VERIFY_TOKEN:-}" ]; then
  META_VERIFY_TOKEN=$(node -e 'process.stdout.write(require("crypto").randomBytes(24).toString("hex"))')
  echo "generated META_VERIFY_TOKEN — paste this into Meta's webhook settings: $META_VERIFY_TOKEN"
fi
put META_VERIFY_TOKEN "$META_VERIFY_TOKEN"
for name in META_APP_SECRET INSTAGRAM_APP_SECRET PRIVACY_CONTACT_EMAIL; do
  if [ -n "${!name:-}" ]; then put "$name" "${!name}"; else echo "not set: $name (add it later in the dashboard or re-run with it set)"; fi
done

echo "== 5. check"
sleep 3
echo "health:  $(curl -s "$URL/health")"
echo "webhook: $URL/meta/webhook"
echo "privacy: $URL/privacy"
