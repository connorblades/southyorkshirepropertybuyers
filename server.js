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

app.use(express.static(DIST));

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

function looksLikePerson(body) {
  const name = `${body.firstName || ''} ${body.lastName || ''}`.trim();
  const phone = String(body.phone || '').replace(/[^\d+]/g, '');
  const email = String(body.email || '').trim();
  const address = String(body.address1 || '').trim();

  if (name.length < 2) return 'no name';
  // a UK number is 10 to 13 digits once punctuation is stripped
  const phoneOk = phone.length >= 10 && phone.length <= 13;
  const emailOk = /^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/.test(email);
  if (!phoneOk && !emailOk) return 'no usable phone or email';
  if (!address) return 'no property address';
  // links in a free-text field are the classic spam signature
  if (/https?:\/\/|\[url=|<a\s/i.test(String(body.notes || ''))) return 'links in message';
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
