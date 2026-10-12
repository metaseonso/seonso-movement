const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function privacyPage(contactEmail: string): string {
  const email = escape(contactEmail);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Privacy Policy · Bamboo Creative Bali</title>
<style>
  body{font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:680px;margin:0 auto;padding:32px 16px;color:#1c2620;background:#fff}
  h1{font-size:1.6rem;margin:0 0 4px} h2{font-size:1.1rem;margin-top:28px}
  @media (prefers-color-scheme:dark){body{background:#11150f;color:#e7ede4} a{color:#7fb789}}
</style>
</head>
<body>
<h1>Privacy Policy</h1>
<p>Bamboo Creative Bali</p>

<h2>What we collect</h2>
<p>When you message Bamboo Creative Bali on WhatsApp or Instagram, we receive your message, any photos or files you send, your WhatsApp number or Instagram account ID, your profile name, and the time it was sent.</p>

<h2>Why we collect it</h2>
<p>Only to read and answer your enquiry, keep a record of our conversation with you, and follow up on work we do for you.</p>

<h2>Who can see it</h2>
<p>Bamboo Creative Bali staff who handle enquiries. Messages are stored on Cloudflare's infrastructure and delivered through Meta's WhatsApp and Instagram platforms. We do not sell your information or share it for advertising.</p>

<h2>How long we keep it</h2>
<p>For as long as needed to serve you and meet our business record obligations, unless you ask us to delete it.</p>

<h2>Deleting your data</h2>
<p>Email <a href="mailto:${email}">${email}</a> with your WhatsApp number or Instagram username and ask for your data to be deleted. We will delete it and confirm by reply.</p>

<h2>Contact</h2>
<p><a href="mailto:${email}">${email}</a></p>
</body>
</html>`;
}
