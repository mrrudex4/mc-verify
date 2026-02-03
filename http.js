// ─── http.js ─────────────────────────────────────────────────────
// Express server.  Render requires an HTTP listener on PORT or it
// will spin the instance down.  We also expose useful endpoints:
//
//   GET  /              – health check (Render pings this)
//   GET  /status        – current MC server status as JSON
//   GET  /whitelist     – current whitelist as JSON
//   POST /chat          – receive chat/join/leave events from your MC server
//
// The POST /chat body must be JSON:
//   { "type": "chat"|"join"|"leave", "player": "Steve", "message": "hello" }
//
// Auth: if CHAT_WEBHOOK_SECRET is set in env, the request MUST carry
//       the header   X-Webhook-Secret: <your secret>

const express = require('express');
const config  = require('./config');
const { queryServer }    = require('./status');
const { getList }        = require('./whitelist');
const { postToDiscord }  = require('./chat');

// ─── factory ─────────────────────────────────────────────────────
// Call startHTTP(discordClient) from bot.js after the client is ready.
function startHTTP(client) {
  const app = express();
  app.use(express.json());

  // ── GET / ──────────────────────────────────────────────────
  app.get('/', (_req, res) => {
    res.json({ status: 'ok', bot: client.user?.tag || 'not ready' });
  });

  // ── GET /status ────────────────────────────────────────────
  app.get('/status', async (_req, res) => {
    try {
      const data = await queryServer();
      res.json(data);
    } catch (err) {
      res.status(500).json({ online: false, error: err.message });
    }
  });

  // ── GET /whitelist ─────────────────────────────────────────
  app.get('/whitelist', (_req, res) => {
    res.json(getList());
  });

  // ── POST /chat ─────────────────────────────────────────────
  app.post('/chat', async (req, res) => {
    // ── auth check ──────────────────────────────────────────
    const secret = config.CHAT_WEBHOOK_SECRET;
    if (secret) {
      const provided = req.headers['x-webhook-secret'];
      if (provided !== secret) {
        console.warn('[HTTP] /chat — bad or missing X-Webhook-Secret');
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    // ── validate body ───────────────────────────────────────
    const { type, player, message } = req.body || {};

    if (!type || !player) {
      return res.status(400).json({ error: 'Missing "type" and/or "player"' });
    }

    const validTypes = ['chat', 'join', 'leave'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
    }

    if (type === 'chat' && !message) {
      return res.status(400).json({ error: 'type "chat" requires a "message" field' });
    }

    // ── forward to Discord ──────────────────────────────────
    try {
      await postToDiscord(client, type, { player, message });
      res.json({ ok: true });
    } catch (err) {
      console.error('[HTTP] /chat handler error:', err);
      res.status(500).json({ error: 'Failed to post to Discord' });
    }
  });

  // ── listen ─────────────────────────────────────────────────
  app.listen(config.PORT, () => {
    console.log(`[HTTP] Server listening on port ${config.PORT}`);
  });

  return app;
}

module.exports = { startHTTP };
