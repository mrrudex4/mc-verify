// ─── config.js ───────────────────────────────────────────────────
// Everything is read from environment variables.
// Set them in Render's "Environment" tab (or in a .env file locally).
// See .env.example for the full list.

module.exports = {
  // ── HTTP ─────────────────────────────────────────────────────
  PORT: process.env.PORT || 3000,                          // Render sets PORT automatically

  // ── Discord ──────────────────────────────────────────────────
  DISCORD_TOKEN:          process.env.DISCORD_TOKEN,
  STATUS_CHANNEL_ID:      process.env.STATUS_CHANNEL_ID,
  CHAT_CHANNEL_ID:        process.env.CHAT_CHANNEL_ID,
  ADMIN_ROLE_ID:          process.env.ADMIN_ROLE_ID || '',
  OWNER_ID:               process.env.OWNER_ID || '',

  // ── Minecraft ────────────────────────────────────────────────
  MC_SERVER_IP:           process.env.MC_SERVER_IP || '127.0.0.1',
  MC_SERVER_PORT:         Number(process.env.MC_SERVER_PORT) || 25565,
  MC_SERVER_DISPLAY_NAME: process.env.MC_SERVER_DISPLAY_NAME || 'My MC Server',

  // ── Chat webhook auth ────────────────────────────────────────
  // Your MC server will POST to /chat with this secret in the header.
  // Pick any random string — keep it secret.
  CHAT_WEBHOOK_SECRET:    process.env.CHAT_WEBHOOK_SECRET || '',

  // ── Status monitor ───────────────────────────────────────────
  STATUS_CHECK_INTERVAL_MS: Number(process.env.STATUS_CHECK_INTERVAL_MS) || 30000,

  // ── Persistent disk path (Render mounts disks at /data) ─────
  WHITELIST_PATH:         process.env.WHITELIST_PATH || '/data/whitelist.json',

  // ── Embed colours ────────────────────────────────────────────
  COLOR_ONLINE:  0x57f287,
  COLOR_OFFLINE: 0xeb4034,
  COLOR_INFO:    0x5865f2,
};
