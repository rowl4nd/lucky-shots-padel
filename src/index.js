// src/index.js
// Worker entry point for luckyshots.co.uk
//
// Static assets are served automatically by the assets binding before this
// Worker runs. This code only sees requests that don't match a file on disk.
// We handle POST /api/subscribe and hand everything else back to ASSETS so
// the normal 404 page still works.
//
// Secrets/vars (Settings > Variables and secrets, after first deploy):
//   RESEND_API_KEY      re_xxxxxxxx        -> Secret
//   RESEND_AUDIENCE_ID  78261eea-....      -> Text

const FROM = 'Lucky Shots Padel <padel@luckyshots.co.uk>';
const REPLY_TO = 'padel@luckyshots.co.uk';
const SITE = 'https://luckyshots.co.uk';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/subscribe') {
      if (request.method !== 'POST') {
        return json(405, { error: 'Method not allowed.' });
      }
      return handleSubscribe(request, env);
    }

    // Not an API route -> static assets (and their 404 handling).
    return env.ASSETS.fetch(request);
  },
};

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

// Deliberately permissive. Rejecting valid-but-unusual addresses loses subscribers.
const looksLikeEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);

async function handleSubscribe(request, env) {
  if (!env.RESEND_API_KEY) return json(500, { error: 'Not configured.' });

  let payload;
  try {
    const ct = request.headers.get('content-type') || '';
    payload = ct.includes('application/json')
      ? await request.json()
      : Object.fromEntries(await request.formData());
  } catch {
    return json(400, { error: 'Bad request.' });
  }

  // Honeypot: bots fill hidden fields, humans don't.
  if (payload.hp) return json(200, { ok: true });

  const email = String(payload.email || '').trim().toLowerCase();
  if (!looksLikeEmail(email)) {
    return json(400, { error: 'That email address doesn\u2019t look right.' });
  }

  const auth = {
    Authorization: `Bearer ${env.RESEND_API_KEY}`,
    'content-type': 'application/json',
  };

  // 1. Add to audience. Non-fatal if it fails (e.g. already subscribed):
  //    we still want them to get the welcome email.
try {
    const c = await fetch('https://api.resend.com/contacts', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ email, unsubscribed: false }),
    });
    if (!c.ok) console.error('contact add failed', c.status, await c.text());
  } catch (err) {
    console.error('contact add threw', err);
  }

  // 2. Send the welcome email.
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        from: FROM,
        to: [email],
        reply_to: REPLY_TO,
        subject: 'Thanks for your interest in Lucky Shots Padel',
        html: welcomeHtml(),
        text: welcomeText(),
        headers: {
          'List-Unsubscribe': `<mailto:${REPLY_TO}?subject=Unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
    });

    if (!res.ok) {
      console.error('resend send failed', res.status, await res.text());
      return json(502, { error: 'We couldn\u2019t send your email just now. Please try again.' });
    }
  } catch (err) {
    console.error('resend send threw', err);
    return json(502, { error: 'We couldn\u2019t send your email just now. Please try again.' });
  }

  return json(200, { ok: true });
}

/* ---------- email template ---------- */
// Brand guide, 9 Oct 2026: two colours only (dark green + pale yellow), white for
// body copy on green. Outfit for type. Trend Sans One is a licensed font and is
// deliberately NOT embedded in email, so labels use Outfit 600 in wide-spaced caps.
// Images used here live in /assets: logo-yellow.png and script-list.png.

const GREEN = '#002813';
const YELLOW = '#F7F38E';
const WHITE = '#FFFFFF';
const FONT = "'Outfit','Helvetica Neue',Helvetica,Arial,sans-serif";

function welcomeHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>Thanks for your interest in Lucky Shots Padel</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;600;800&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${GREEN};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">We can&rsquo;t wait to meet you. Here&rsquo;s what happens next.</div>

<!-- Band 1: green. Logo, eyebrow, rule, headline with script accent -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${GREEN}" style="background:${GREEN};">
<tr><td align="center" style="padding:40px 24px 48px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">

    <tr><td align="left" style="padding:0 0 44px;">
      <img src="${SITE}/assets/logo-yellow.png" alt="Lucky Shots Padel" width="220" style="display:block;border:0;width:220px;max-width:100%;height:auto;">
    </td></tr>

    <tr><td align="left" style="padding:0 0 14px;font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:${YELLOW};">
      Thank you for your interest
    </td></tr>

    <tr><td align="left" style="padding:0 0 22px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="56" height="6" bgcolor="${YELLOW}" style="width:56px;height:6px;line-height:6px;font-size:0;background:${YELLOW};">&nbsp;</td>
      </tr></table>
    </td></tr>

    <tr><td align="left" style="padding:0;">
      <h1 style="margin:0;font-family:${FONT};font-size:48px;line-height:1;font-weight:800;letter-spacing:-.025em;text-transform:uppercase;color:${YELLOW};">You&rsquo;re on the<br><img src="${SITE}/assets/script-list.png" alt="list." width="170" style="display:inline-block;border:0;width:170px;max-width:60%;height:auto;margin:-6px 0 0 -8px;"></h1>
    </td></tr>

  </table>
</td></tr>
</table>

<!-- Band 2: yellow. Copy and button -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${YELLOW}" style="background:${YELLOW};">
<tr><td align="center" style="padding:44px 24px 52px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">

    <tr><td align="left" style="padding:0 0 16px;font-family:${FONT};font-size:26px;line-height:1.25;font-weight:600;letter-spacing:-.01em;color:${GREEN};">
      We can&rsquo;t wait to meet you.
    </td></tr>

    <tr><td align="left" style="padding:0 0 16px;font-family:${FONT};font-size:17px;line-height:1.6;font-weight:300;color:${GREEN};">
      In the meantime, we&rsquo;ll send you updates on our build progress, our opening dates,
      and founding membership offers.
    </td></tr>

    <tr><td align="left" style="padding:0 0 32px;font-family:${FONT};font-size:17px;line-height:1.6;font-weight:600;color:${GREEN};">
      Stay tuned&hellip;
    </td></tr>

    <tr><td align="left">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td align="center" bgcolor="${GREEN}" style="background:${GREEN};border-radius:999px;">
          <a href="https://www.instagram.com/luckyshotspadel"
             style="display:inline-block;padding:15px 30px;font-family:${FONT};font-size:15px;font-weight:600;line-height:1;color:${YELLOW};text-decoration:none;border-radius:999px;">
            Follow us on Instagram
          </a>
        </td>
      </tr></table>
    </td></tr>

  </table>
</td></tr>
</table>

<!-- Band 3: green. Footer -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${GREEN}" style="background:${GREEN};">
<tr><td align="center" style="padding:32px 24px 40px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
    <tr><td align="left" style="padding:0 0 6px;font-family:${FONT};font-size:12px;line-height:1.6;font-weight:300;color:${WHITE};">
      Lucky Shots Padel &middot; <a href="${SITE}" style="color:${YELLOW};text-decoration:underline;">luckyshots.co.uk</a>
    </td></tr>
    <tr><td align="left" style="font-family:${FONT};font-size:12px;line-height:1.6;font-weight:300;color:${WHITE};">
      You&rsquo;re receiving this because you signed up on our website.
      <a href="mailto:${REPLY_TO}?subject=Unsubscribe" style="color:${YELLOW};text-decoration:underline;">Unsubscribe</a>
    </td></tr>
  </table>
</td></tr>
</table>

</body>
</html>`;
}

function welcomeText() {
  return `Thank you for your interest in Lucky Shots Padel.

We can't wait to meet you.

In the meantime, we'll send you updates on our build progress, our opening dates, and founding membership offers.

Stay tuned...

Lucky Shots Padel
${SITE}

You're receiving this because you signed up on our website.
To unsubscribe, reply to this email with "Unsubscribe".`;
}
