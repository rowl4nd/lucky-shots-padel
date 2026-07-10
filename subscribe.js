// functions/api/subscribe.js
// POST { email, hp } -> adds contact to Resend audience + sends branded welcome email.
// Env vars required (Cloudflare Pages > Settings > Environment variables):
//   RESEND_API_KEY      e.g. re_xxxxxxxx   (mark as Secret)
//   RESEND_AUDIENCE_ID  e.g. 78261eea-....

const FROM = 'Lucky Shots Padel <padel@luckyshots.co.uk>';
const REPLY_TO = 'padel@luckyshots.co.uk';
const SITE = 'https://luckyshots.co.uk';

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

// Deliberately permissive. Rejecting valid-but-unusual addresses loses subscribers.
const looksLikeEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);

export async function onRequestPost({ request, env }) {
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

  // 1. Add to audience. Non-fatal if it fails (e.g. already subscribed) —
  //    we still want them to get the welcome email.
  if (env.RESEND_AUDIENCE_ID) {
    try {
      await fetch(
        `https://api.resend.com/audiences/${env.RESEND_AUDIENCE_ID}/contacts`,
        {
          method: 'POST',
          headers: auth,
          body: JSON.stringify({ email, unsubscribed: false }),
        }
      );
    } catch (err) {
      console.error('audience add failed', err);
    }
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

const EDEN = '#264E36';
const BOTTLE = '#427D6D';
const VANILLA = '#F0EADA';
const BEES = '#F4F28D';

function welcomeHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Thanks for your interest in Lucky Shots Padel</title>
</head>
<body style="margin:0;padding:0;background:${VANILLA};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">We can&rsquo;t wait to meet you. Here&rsquo;s what happens next.</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${VANILLA};">
<tr><td align="center" style="padding:32px 16px;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

    <tr><td align="center" style="padding:0 0 24px;">
      <img src="${SITE}/img/logo_header.png" alt="Lucky Shots Padel" width="180" style="display:block;border:0;max-width:180px;height:auto;">
    </td></tr>

    <tr><td style="background:${EDEN};border-radius:20px;padding:36px 32px;">

      <p style="margin:0 0 6px;font-family:'Outfit',Helvetica,Arial,sans-serif;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:${BEES};">
        You&rsquo;re on the list
      </p>

      <h1 style="margin:0 0 20px;font-family:'Trend Sans One','Outfit',Helvetica,Arial,sans-serif;font-size:30px;line-height:1.25;font-weight:700;color:${VANILLA};">
        Thank you for your interest in Lucky&nbsp;Shots&nbsp;Padel
      </h1>

      <p style="margin:0 0 16px;font-family:'Outfit',Helvetica,Arial,sans-serif;font-size:17px;line-height:1.6;color:${VANILLA};">
        We can&rsquo;t wait to meet you.
      </p>

      <p style="margin:0 0 16px;font-family:'Outfit',Helvetica,Arial,sans-serif;font-size:17px;line-height:1.6;color:${VANILLA};">
        In the meantime, we&rsquo;ll send you updates on our build progress, our opening dates,
        and founding membership offers.
      </p>

      <p style="margin:0;font-family:'Outfit',Helvetica,Arial,sans-serif;font-size:17px;line-height:1.6;color:${BEES};">
        Stay tuned&hellip;
      </p>

    </td></tr>

    <tr><td align="center" style="padding:28px 0 0;">
      <a href="https://www.instagram.com/luckyshotspadel"
         style="display:inline-block;background:${BOTTLE};color:${VANILLA};text-decoration:none;
                font-family:'Outfit',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;
                padding:13px 26px;border-radius:999px;">
        Follow us on Instagram
      </a>
    </td></tr>

    <tr><td align="center" style="padding:28px 8px 0;">
      <p style="margin:0 0 6px;font-family:'Outfit',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${BOTTLE};">
        Lucky Shots Padel &middot; <a href="${SITE}" style="color:${BOTTLE};">luckyshots.co.uk</a>
      </p>
      <p style="margin:0;font-family:'Outfit',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${BOTTLE};">
        You&rsquo;re receiving this because you signed up on our website.
        <a href="mailto:${REPLY_TO}?subject=Unsubscribe" style="color:${BOTTLE};">Unsubscribe</a>
      </p>
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
