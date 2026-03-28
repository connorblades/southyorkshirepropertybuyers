const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const GHL_WEBHOOK = 'https://services.leadconnectorhq.com/hooks/Lt1hJmen7QrCZZJy7bzf/webhook-trigger/dbb7d1c7-69c1-43c2-9bb7-ff9fb7df4e09';

app.use(express.json());
app.use(express.static(path.join(__dirname)));

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
