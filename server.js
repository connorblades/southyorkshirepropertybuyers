const express = require('express');
const path = require('path');

// Build dist/ from website/ at startup. dist/ is gitignored, and Hostinger's
// default Node deployment runs `npm install` + `npm start` without
// `npm run build` — building here makes the server self-sufficient on any host.
require('./build');

const app = express();
app.set('trust proxy', 1);   // Hostinger fronts this, so req.ip is the real client
const PORT = process.env.PORT || 3000;

const GHL_WEBHOOK = 'https://services.leadconnectorhq.com/hooks/Lt1hJmen7QrCZZJy7bzf/webhook-trigger/0e1dc81a-9083-4e12-be50-a0aa1d486a27';

const DIST = path.join(__dirname, 'dist');

app.use(express.json());

app.use((req, res, next) => {
  if (req.headers.host && req.headers.host.startsWith('www.')) {
    return res.redirect(301, 'https://southyorkshirepropertybuyers.com' + req.url);
  }
  next();
});

// Every asset was going out with cache-control: max-age=0, so a visitor
// refetched the stylesheet, the scripts and the images on every page they
// looked at. HTML stays uncached because a deploy must show immediately, but
// the rest can be held: the stylesheet and scripts are versioned in the markup
// (styles.css?v=27), so bumping that number is how we bust them.
const YEAR = 365 * 24 * 60 * 60 * 1000;
const WEEK = 7 * 24 * 60 * 60 * 1000;

app.use(express.static(DIST, {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    } else if (/[\\/](css|js)[\\/]/.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=' + WEEK / 1000);
    } else if (/[\\/](images|media)[\\/]/.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=' + YEAR / 1000 + ', immutable');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=' + WEEK / 1000);
    }
  }
}));

// ---------------------------------------------------------------------------
// Lead spam filtering.
//
// Splitting the form over several pages would not help: the form is not what
// gets attacked. This endpoint is public, so a bot can POST straight to it
// without ever loading a page. Everything below sits in front of the GHL
// webhook, which is unchanged.
//
// A rejected submission is logged and answered with { ok: true }. Telling a bot
// it failed invites a retry with different values; telling it that it worked
// usually ends the attempt. A real person who somehow trips a rule still sees
// the normal thank-you page, so nobody is left staring at an error.
// ---------------------------------------------------------------------------

const ALLOWED_HOSTS = ['southyorkshirepropertybuyers.com', 'www.southyorkshirepropertybuyers.com'];
const MIN_FILL_MS = 3000;        // nobody types nine fields faster than this
const RATE_LIMIT = 20;           // submissions per IP per hour. Deliberately
                                 // generous: UK mobile carriers use CGNAT, so
                                 // many real people share one address. A bot
                                 // flood is hundreds, so 20 still stops it
                                 // without ever touching a genuine enquiry.
const RATE_WINDOW_MS = 60 * 60 * 1000;

const recent = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const hits = (recent.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);
  hits.push(now);
  recent.set(ip, hits);
  if (recent.size > 5000) {
    for (const [k, v] of recent) if (!v.some(t => now - t < RATE_WINDOW_MS)) recent.delete(k);
  }
  return hits.length > RATE_LIMIT;
}

// Field length ceilings. Generous for a real person, but they stop the
// enormous values spam tends to carry. localPart is 45 rather than the RFC's
// 64 because real addresses are far shorter and the spam that got through here
// used very long local parts.
const MAX = { name: 80, email: 254, localPart: 45, address: 200, notes: 2000 };

// Digits that are obviously not a phone number. Two signals, both chosen so a
// real number cannot trip them: almost no digit variety (0000000000,
// 07000000000, 5555555555), or a long unbroken counting run (1234567890). The
// run threshold is 9, tuned by testing real numbers: an 0800 number and a
// Spanish mobile both contain runs of 7 and 8, so anything tighter rejected
// genuine callers. Turning away a real seller costs far more than letting one
// spam lead through, and the honeypot and timing checks are the strong layers
// anyway.
function fakeDigits(d) {
  if (new Set(d).size <= 2) return true;
  let run = 1;
  for (let i = 1; i < d.length; i++) {
    const step = +d[i] - +d[i - 1];
    run = (step === 1 || step === -1) ? run + 1 : 1;
    if (run >= 9) return true;
  }
  return false;
}

// Accepts a UK number in any of the ways people actually type it, and a genuine
// international number too: an owner selling a UK property from abroad is a
// real case and must not be turned away.
function phoneIsPlausible(raw) {
  let v = String(raw || '').replace(/[^\d+]/g, '');
  if (!v) return false;

  if (v.startsWith('+') && !v.startsWith('+44')) {
    const d = v.slice(1);
    return d.length >= 8 && d.length <= 15 && !fakeDigits(d);
  }

  v = v.replace(/^\+?44/, '0');
  if (/^[1237]\d{9}$/.test(v)) v = '0' + v;   // typed without the leading zero

  if (!/^0[123478]\d{8,9}$/.test(v)) return false;
  return !fakeDigits(v.slice(1));
}

function emailIsPlausible(raw) {
  const v = String(raw || '').trim();
  if (!v || v.length > MAX.email) return false;
  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/.test(v)) return false;
  const [local, domain] = v.split('@');
  if (local.length > MAX.localPart) return false;
  if (domain.length > 190) return false;
  return true;
}

function looksLikePerson(body) {
  const name = `${body.firstName || ''} ${body.lastName || ''}`.trim();
  const address = String(body.address1 || '').trim();
  const notes = String(body.notes || '');

  if (name.length < 2) return 'no name';
  if (name.length > MAX.name) return 'name absurdly long';
  if (!address) return 'no property address';
  if (address.length > MAX.address) return 'address absurdly long';
  if (notes.length > MAX.notes) return 'message absurdly long';

  const gotPhone = phoneIsPlausible(body.phone);
  const gotEmail = emailIsPlausible(body.email);

  // One good contact route is enough, but a supplied value that is clearly junk
  // is a spam signal in its own right even when the other field is fine.
  if (!gotPhone && !gotEmail) return 'no usable phone or email';
  if (String(body.phone || '').trim() && !gotPhone) return 'phone not a real number';
  if (String(body.email || '').trim() && !gotEmail) return 'email not usable';

  if (/https?:\/\/|\[url=|<a\s/i.test(notes)) return 'links in message';
  return null;
}

function reject(reason, req, body) {
  console.warn('[lead-rejected]', JSON.stringify({
    reason,
    ip: req.ip,
    ua: (req.headers['user-agent'] || '').slice(0, 120),
    origin: req.headers.origin || req.headers.referer || null,
    name: `${body.firstName || ''} ${body.lastName || ''}`.trim().slice(0, 60),
    email: String(body.email || '').slice(0, 80),
    phone: String(body.phone || '').slice(0, 30),
    at: new Date().toISOString()
  }));
}

app.post('/api/submit', async (req, res) => {
  const body = req.body || {};

  // 1. Honeypot. Only something reading the DOM blindly fills this.
  if (String(body._hp || '').trim()) {
    reject('honeypot', req, body);
    return res.json({ ok: true });
  }

  // 2. Submitted impossibly fast. Absent on older cached pages, so only
  //    enforced when the field is actually present.
  if (typeof body._elapsed === 'number' && body._elapsed < MIN_FILL_MS) {
    reject(`too fast (${body._elapsed}ms)`, req, body);
    return res.json({ ok: true });
  }

  // 3. Posted from somewhere other than the site.
  const origin = req.headers.origin || req.headers.referer || '';
  if (origin) {
    let host = '';
    try { host = new URL(origin).hostname; } catch (_) {}
    if (host && !ALLOWED_HOSTS.includes(host)) {
      reject(`bad origin ${host}`, req, body);
      return res.json({ ok: true });
    }
  }

  // 4. Not enough to be a lead.
  const problem = looksLikePerson(body);
  if (problem) {
    reject(problem, req, body);
    return res.json({ ok: true });
  }

  // 5. Flooding from one address.
  if (rateLimited(req.ip)) {
    reject('rate limit', req, body);
    return res.json({ ok: true });
  }

  // Strip our own signals so GHL sees exactly what it saw before.
  const { _hp, _elapsed, ...lead } = body;

  try {
    const response = await fetch(GHL_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead)
    });
    console.log('[lead-accepted]', JSON.stringify({
      name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim().slice(0, 60),
      page: lead.sourcePage || null, ok: response.ok, at: new Date().toISOString()
    }));
    res.json({ ok: response.ok });
  } catch (err) {
    console.error('GHL webhook error:', err);
    res.json({ ok: false });
  }
});

// Custom 404 — serve the site's 404 page with the correct status code.
app.use((req, res) => {
  res.status(404).sendFile(path.join(DIST, '404.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
