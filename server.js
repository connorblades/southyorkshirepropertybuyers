const express = require('express');
const path = require('path');

// Build dist/ from website/ at startup. dist/ is gitignored, and Hostinger's
// default Node deployment runs `npm install` + `npm start` without
// `npm run build` — building here makes the server self-sufficient on any host.
require('./build');

const app = express();
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

app.post('/api/submit', async (req, res) => {
  try {
    const response = await fetch(GHL_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
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
