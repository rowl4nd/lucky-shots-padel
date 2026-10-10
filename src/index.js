// src/index.js
// Worker entry point for luckyshots.co.uk
//
// Static assets are served automatically by the assets binding before this
// Worker runs. This code only sees requests that don't match a file on disk.
// We handle:
//   POST /api/subscribe   sign-up form: add (or re-subscribe) the contact, send the welcome email
//   GET  /unsubscribe     signed link from our emails: shows a confirm page (changes nothing)
//   POST /unsubscribe     confirm button, or a mail app's one-click unsubscribe: removes the
//                         contact from the Resend list and emails a confirmation
// Everything else goes back to ASSETS so the normal 404 page still works.
//
// Secrets/vars (Settings > Variables and secrets, after first deploy):
//   RESEND_API_KEY       re_xxxxxxxx   -> Secret (required)
//   UNSUBSCRIBE_SECRET   any long random string -> Secret (optional). Signs the unsubscribe
//                        links so nobody can unsubscribe someone else. If it is not set,
//                        RESEND_API_KEY is used as the signing key instead.
//   RESEND_AUDIENCE_ID   not used by this code.
//
// Note: changing UNSUBSCRIBE_SECRET (or the API key, when no secret is set) invalidates
// every unsubscribe link already sent. Those people can still email padel@luckyshots.co.uk.

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

    if (url.pathname === '/unsubscribe') {
      return handleUnsubscribe(request, env);
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

const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/* ---------- Resend helpers ---------- */

const resendHeaders = (env) => ({
  Authorization: `Bearer ${env.RESEND_API_KEY}`,
  'content-type': 'application/json',
});

// Sets the contact's global subscribed state in Resend. If the contact does not exist
// yet (404) it is created with the same state, so an unsubscribe is always recorded
// and a new sign-up is always added. Returns true on success.
async function setSubscribed(env, email, subscribed) {
  const body = JSON.stringify({ unsubscribed: !subscribed });
  try {
    let res = await fetch(`https://api.resend.com/contacts/${encodeURIComponent(email)}`, {
      method: 'PATCH',
      headers: resendHeaders(env),
      body,
    });
    if (res.status === 404) {
      res = await fetch('https://api.resend.com/contacts', {
        method: 'POST',
        headers: resendHeaders(env),
        body: JSON.stringify({ email, unsubscribed: !subscribed }),
      });
    }
    if (!res.ok) console.error('contact update failed', res.status, await res.text());
    return res.ok;
  } catch (err) {
    console.error('contact update threw', err);
    return false;
  }
}

async function sendEmail(env, { to, subject, html, text, headers }) {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: resendHeaders(env),
      body: JSON.stringify({
        from: FROM,
        to: [to],
        reply_to: REPLY_TO,
        subject,
        html,
        text,
        ...(headers ? { headers } : {}),
      }),
    });
    if (!res.ok) console.error('resend send failed', res.status, await res.text());
    return res.ok;
  } catch (err) {
    console.error('resend send threw', err);
    return false;
  }
}

/* ---------- signed unsubscribe links ---------- */

const encoder = new TextEncoder();

async function signEmail(env, email) {
  const secret = env.UNSUBSCRIBE_SECRET || env.RESEND_API_KEY;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(`unsubscribe:${email}`));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function tokenIsValid(env, email, token) {
  if (!env.RESEND_API_KEY && !env.UNSUBSCRIBE_SECRET) return false;
  const expected = await signEmail(env, email);
  if (typeof token !== 'string' || token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}

async function unsubscribePath(env, email) {
  return `/unsubscribe?e=${encodeURIComponent(email)}&t=${await signEmail(env, email)}`;
}

/* ---------- POST /api/subscribe ---------- */

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
    return json(400, { error: 'That email address doesn’t look right.' });
  }

  // 1. Add to the list, or switch them back on if they had unsubscribed before
  //    (signing up again is a fresh opt-in). Non-fatal if it fails: we still
  //    want them to get the welcome email.
  await setSubscribed(env, email, true);

  // 2. Send the welcome email, with a personal signed unsubscribe link.
  const unsubUrl = SITE + (await unsubscribePath(env, email));
  const sent = await sendEmail(env, {
    to: email,
    subject: 'Thanks for your interest in Lucky Shots Padel',
    html: welcomeHtml(unsubUrl),
    text: welcomeText(unsubUrl),
    headers: {
      // RFC 8058 one-click: mail apps POST to the https URL, which unsubscribes straight away.
      'List-Unsubscribe': `<${unsubUrl}>, <mailto:${REPLY_TO}?subject=Unsubscribe>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });
  if (!sent) {
    return json(502, { error: 'We couldn’t send your email just now. Please try again.' });
  }

  return json(200, { ok: true });
}

/* ---------- /unsubscribe ---------- */

async function handleUnsubscribe(request, env) {
  const method = request.method;
  if (method !== 'GET' && method !== 'HEAD' && method !== 'POST') {
    return new Response('Method not allowed.', { status: 405, headers: { allow: 'GET, HEAD, POST' } });
  }

  const url = new URL(request.url);
  const email = (url.searchParams.get('e') || '').trim().toLowerCase();
  const token = url.searchParams.get('t') || '';

  // Mail apps send "List-Unsubscribe=One-Click" as a form body.
  let oneClick = false;
  if (method === 'POST') {
    try {
      const form = await request.formData();
      oneClick = form.get('List-Unsubscribe') === 'One-Click';
    } catch {
      /* no body, treat as the confirm button */
    }
  }

  const valid = looksLikeEmail(email) && (await tokenIsValid(env, email, token));
  if (!valid) {
    return oneClick
      ? new Response('Invalid link.', { status: 400 })
      : sitePage(400, invalidPage());
  }

  // A plain GET only shows the confirm page. Email security scanners open links
  // before the recipient does, so a GET must never unsubscribe anyone.
  if (method !== 'POST') {
    return sitePage(200, confirmPage(email, url.pathname + url.search), method === 'HEAD');
  }

  const removed = await setSubscribed(env, email, false);
  if (!removed) {
    return oneClick
      ? new Response('Could not unsubscribe, please try again.', { status: 502 })
      : sitePage(502, errorPage());
  }

  const confirmed = await sendEmail(env, {
    to: email,
    subject: 'You’ve been unsubscribed from Lucky Shots Padel',
    html: unsubscribedHtml(),
    text: unsubscribedText(),
  });

  return oneClick
    ? new Response('Unsubscribed.', { status: 200 })
    : sitePage(200, donePage(email, confirmed));
}

/* ---------- unsubscribe pages (use the site's own styles and header/footer) ---------- */

function sitePage(status, main, headOnly = false) {
  const html = `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <meta name="referrer" content="no-referrer" />
  <title>Unsubscribe | Lucky Shots Padel</title>
  <meta name="theme-color" content="#002813" />
  <link rel="icon" href="/assets/favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" href="/assets/favicon-32.png" sizes="32x32" />
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;600;800&family=Yellowtail&display=swap" rel="stylesheet" />
  <script>document.documentElement.classList.add('js');</script>
  <link rel="stylesheet" href="/styles.css" />
  <script defer src="/components.js"></script>
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>
  <site-header></site-header>
  <main id="main">
    <section class="page-hero">
      <div class="wrap">
${main}
      </div>
    </section>
  </main>
  <site-footer></site-footer>
</body>
</html>`;
  return new Response(headOnly ? null : html, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex',
      'referrer-policy': 'no-referrer',
    },
  });
}

function confirmPage(email, actionPath) {
  return `        <span class="eyebrow">Unsubscribe</span>
        <span class="rule"></span>
        <h1 class="display"><span class="script script-xl">Leaving</span>the list?</h1>
        <p class="lead">Confirm and we&rsquo;ll stop all emails to <strong>${escapeHtml(email)}</strong>.</p>
        <form method="post" action="${escapeHtml(actionPath)}">
          <div class="btn-row">
            <button class="btn btn-yellow" type="submit">Yes, unsubscribe me</button>
            <a class="btn btn-line" href="/">Keep me on the list</a>
          </div>
        </form>`;
}

function donePage(email, confirmed) {
  const extra = confirmed
    ? ' We&rsquo;ve emailed you to confirm.'
    : '';
  return `        <span class="eyebrow">Unsubscribed</span>
        <span class="rule"></span>
        <h1 class="display"><span class="script script-xl">Done.</span>You&rsquo;re off the list.</h1>
        <p class="lead">We&rsquo;ve removed <strong>${escapeHtml(email)}</strong> and you won&rsquo;t get any more emails from us.${extra}</p>
        <div class="btn-row">
          <a class="btn btn-yellow" href="/">Back to the site</a>
        </div>`;
}

function invalidPage() {
  return `        <span class="eyebrow">Unsubscribe</span>
        <span class="rule"></span>
        <h1 class="display"><span class="script script-xl">Hmm.</span>That link doesn&rsquo;t work.</h1>
        <p class="lead">It may have been cut short in your email app. Email <a href="mailto:${REPLY_TO}?subject=Unsubscribe">${REPLY_TO}</a> and we&rsquo;ll remove you by hand.</p>
        <div class="btn-row">
          <a class="btn btn-yellow" href="/">Back to the site</a>
        </div>`;
}

function errorPage() {
  return `        <span class="eyebrow">Unsubscribe</span>
        <span class="rule"></span>
        <h1 class="display"><span class="script script-xl">Sorry.</span>Something went wrong.</h1>
        <p class="lead">You&rsquo;re still on the list. Please try the link again, or email <a href="mailto:${REPLY_TO}?subject=Unsubscribe">${REPLY_TO}</a> and we&rsquo;ll remove you by hand.</p>
        <div class="btn-row">
          <a class="btn btn-yellow" href="/">Back to the site</a>
        </div>`;
}

/* ---------- email templates ---------- */
// Brand guide, 9 Oct 2026: two colours only (dark green + pale yellow), white for
// body copy on green. Outfit for type. Trend Sans One is a licensed font and is
// deliberately NOT embedded in email, so labels use Outfit 600 in wide-spaced caps.
// Images used here live in /assets: logo-yellow.png and script-list.png.

const GREEN = '#002813';
const YELLOW = '#F7F38E';
const WHITE = '#FFFFFF';
const FONT = "'Outfit','Helvetica Neue',Helvetica,Arial,sans-serif";

// Shared layout for every email: green band (logo, label, rule, headline with the
// script word), yellow band (copy and a button), green footer.
function emailShell({ title, preheader, eyebrow, headlineTop, subhead, paragraphs, closing, button, footerLines }) {
  const para = (text) => `
    <tr><td align="left" style="padding:0 0 16px;font-family:${FONT};font-size:17px;line-height:1.6;font-weight:300;color:${GREEN};">
      ${text}
    </td></tr>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;600;800&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${GREEN};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>

<!-- Band 1: green. Logo, eyebrow, rule, headline with script accent -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${GREEN}" style="background:${GREEN};">
<tr><td align="center" style="padding:40px 24px 48px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">

    <tr><td align="left" style="padding:0 0 44px;">
      <img src="${SITE}/assets/logo-yellow.png" alt="Lucky Shots Padel" width="220" style="display:block;border:0;width:220px;max-width:100%;height:auto;">
    </td></tr>

    <tr><td align="left" style="padding:0 0 14px;font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:${YELLOW};">
      ${eyebrow}
    </td></tr>

    <tr><td align="left" style="padding:0 0 22px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="56" height="6" bgcolor="${YELLOW}" style="width:56px;height:6px;line-height:6px;font-size:0;background:${YELLOW};">&nbsp;</td>
      </tr></table>
    </td></tr>

    <tr><td align="left" style="padding:0;">
      <h1 style="margin:0;font-family:${FONT};font-size:48px;line-height:1;font-weight:800;letter-spacing:-.025em;text-transform:uppercase;color:${YELLOW};">${headlineTop}<br><img src="${SITE}/assets/script-list.png" alt="list." width="170" style="display:inline-block;border:0;width:170px;max-width:60%;height:auto;margin:-6px 0 0 -8px;"></h1>
    </td></tr>

  </table>
</td></tr>
</table>

<!-- Band 2: yellow. Copy and button -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${YELLOW}" style="background:${YELLOW};">
<tr><td align="center" style="padding:44px 24px 52px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">

    <tr><td align="left" style="padding:0 0 16px;font-family:${FONT};font-size:26px;line-height:1.25;font-weight:600;letter-spacing:-.01em;color:${GREEN};">
      ${subhead}
    </td></tr>
${paragraphs.map(para).join('')}
    <tr><td align="left" style="padding:0 0 32px;font-family:${FONT};font-size:17px;line-height:1.6;font-weight:600;color:${GREEN};">
      ${closing}
    </td></tr>

    <tr><td align="left">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td align="center" bgcolor="${GREEN}" style="background:${GREEN};border-radius:999px;">
          <a href="${button.href}"
             style="display:inline-block;padding:15px 30px;font-family:${FONT};font-size:15px;font-weight:600;line-height:1;color:${YELLOW};text-decoration:none;border-radius:999px;">
            ${button.label}
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
      ${footerLines}
    </td></tr>
  </table>
</td></tr>
</table>

</body>
</html>`;
}

function welcomeHtml(unsubUrl) {
  return emailShell({
    title: 'Thanks for your interest in Lucky Shots Padel',
    preheader: 'We can&rsquo;t wait to meet you. Here&rsquo;s what happens next.',
    eyebrow: 'Thank you for your interest',
    headlineTop: 'You&rsquo;re on the',
    subhead: 'We can&rsquo;t wait to meet you.',
    paragraphs: [
      'In the meantime, we&rsquo;ll send you updates on our build progress, our opening dates, and founding membership offers.',
    ],
    closing: 'Stay tuned&hellip;',
    button: { label: 'Follow us on Instagram', href: 'https://www.instagram.com/luckyshotspadel' },
    footerLines: `You&rsquo;re receiving this because you signed up on our website.
      <a href="${unsubUrl}" style="color:${YELLOW};text-decoration:underline;">Unsubscribe</a>`,
  });
}

function welcomeText(unsubUrl) {
  return `Thank you for your interest in Lucky Shots Padel.

We can't wait to meet you.

In the meantime, we'll send you updates on our build progress, our opening dates, and founding membership offers.

Stay tuned...

Lucky Shots Padel
${SITE}

You're receiving this because you signed up on our website.
Unsubscribe: ${unsubUrl}`;
}

function unsubscribedHtml() {
  return emailShell({
    title: 'You’ve been unsubscribed from Lucky Shots Padel',
    preheader: 'We&rsquo;ve removed you from the list. You won&rsquo;t get any more emails from us.',
    eyebrow: 'You&rsquo;ve been unsubscribed',
    headlineTop: 'You&rsquo;re off the',
    subhead: 'Sorry to see you go.',
    paragraphs: [
      'We&rsquo;ve removed this email address from the Lucky Shots Padel list. You won&rsquo;t get any more emails from us.',
      'If that was a mistake, you can join again any time.',
    ],
    closing: 'Hope to see you on court.',
    button: { label: 'Join the list again', href: `${SITE}/#join` },
    footerLines: 'You&rsquo;re receiving this one-off email to confirm you unsubscribed.',
  });
}

function unsubscribedText() {
  return `You've been unsubscribed from Lucky Shots Padel.

Sorry to see you go.

We've removed this email address from the Lucky Shots Padel list. You won't get any more emails from us.

If that was a mistake, you can join again any time: ${SITE}/#join

Hope to see you on court.

Lucky Shots Padel
${SITE}

You're receiving this one-off email to confirm you unsubscribed.`;
}
