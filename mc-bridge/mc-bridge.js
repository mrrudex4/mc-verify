#!/usr/bin/env node
// ─── mc-bridge.js ────────────────────────────────────────────────
// Run this ON your Minecraft server machine (NOT on Render).
// It does two things:
//   1. Tails logs/latest.log  →  POSTs chat/join/leave to your Render bot
//   2. Listens on a local HTTP port  →  receives relayed Discord messages
//      and injects them into MC via local RCON
//
// Setup:
//   npm install                   (installs express + rcon)
//   cp .env.example .env          (fill it in — see below)
//   node mc-bridge.js
//
// .env vars this file reads:
//   BOT_URL              https://your-render-app.onrender.com   (no trailing slash)
//   WEBHOOK_SECRET       must match CHAT_WEBHOOK_SECRET in Render
//   MC_LOG_PATH          path to logs/latest.log  (default: ./logs/latest.log)
//   RCON_HOST            127.0.0.1
//   RCON_PORT            25575
//   RCON_PASSWORD        (from server.properties)
//   RELAY_PORT           8080  (the port Discord→MC relay listens on)
//   RELAY_SECRET         must match MC_RELAY_SECRET in Render

require('dotenv').config();              // optional — works with a .env file

const fs      = require('fs');
const path    = require('path');
const express = require('express');

// ─── config ──────────────────────────────────────────────────────
const BOT_URL         = process.env.BOT_URL;                           // e.g. https://mc-discord-bot.onrender.com
const WEBHOOK_SECRET  = process.env.WEBHOOK_SECRET || '';
const LOG_PATH        = path.resolve(process.env.MC_LOG_PATH || './logs/latest.log');
const RCON_HOST       = process.env.RCON_HOST       || '127.0.0.1';
const RCON_PORT       = Number(process.env.RCON_PORT) || 25575;
const RCON_PASSWORD   = process.env.RCON_PASSWORD   || '';
const RELAY_PORT      = Number(process.env.RELAY_PORT) || 8080;
const RELAY_SECRET    = process.env.RELAY_SECRET    || '';

if (!BOT_URL) {
  console.error('[mc-bridge] BOT_URL is not set. Set it to your Render app URL.');
  process.exit(1);
}

// ─── regex ───────────────────────────────────────────────────────
const CHAT_RE  = /\[[\d:]+\]\s+\[.+?\/INFO\]:\s+<(.+?)>\s+(.+)/;
const JOIN_RE  = /\[[\d:]+\]\s+\[.+?\/INFO\]:\s+(.+?) joined the game/;
const LEAVE_RE = /\[[\d:]+\]\s+\[.+?\/INFO\]:\s+(.+?) left the game/;

// ─── log tailer ──────────────────────────────────────────────────
let lastSize = 0;

function startTailer() {
  if (!fs.existsSync(LOG_PATH)) {
    console.error(`[mc-bridge] Log not found at ${LOG_PATH}`);
    process.exit(1);
  }
  lastSize = fs.statSync(LOG_PATH).size;   // skip existing content
  console.log(`[mc-bridge] Tailing ${LOG_PATH} from byte ${lastSize}`);
  setInterval(pollLog, 1000);
}

async function pollLog() {
  try {
    const stats = fs.statSync(LOG_PATH);
    if (stats.size < lastSize) lastSize = 0;   // log rotated
    if (stats.size === lastSize) return;

    const chunk = fs.readFileSync(LOG_PATH, { encoding: 'utf8', flag: 'r' });
    // We only care about the new part — slice from lastSize
    // (readFileSync reads the whole file; for large logs consider a stream,
    //  but for a typical MC server this is fine)
    const newPart = chunk.slice(lastSize);
    lastSize = stats.size;

    const lines = newPart.split('\n').filter(Boolean);
    for (const line of lines) await handleLine(line);
  } catch (e) {
    console.error('[mc-bridge] poll error:', e.message);
  }
}

async function handleLine(line) {
  let match;

  match = line.match(CHAT_RE);
  if (match) return postEvent('chat', match[1], match[2]);

  match = line.match(JOIN_RE);
  if (match) return postEvent('join', match[1]);

  match = line.match(LEAVE_RE);
  if (match) return postEvent('leave', match[1]);
}

async function postEvent(type, player, message) {
  try {
    const body = { type, player };
    if (message) body.message = message;

    const res = await fetch(`${BOT_URL}/chat`, {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'X-Webhook-Secret':  WEBHOOK_SECRET,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) console.error(`[mc-bridge] POST /chat → ${res.status}`);
  } catch (e) {
    console.error('[mc-bridge] POST failed:', e.message);
  }
}

// ─── relay listener (Discord → MC) ───────────────────────────────
// The Render bot POSTs here with { player, message }.
// We forward it into MC via local RCON.

const app = express();
app.use(express.json());

app.post('/relay', async (req, res) => {
  // auth
  if (RELAY_SECRET && req.headers['x-relay-secret'] !== RELAY_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { player, message } = req.body || {};
  if (!player || !message) {
    return res.status(400).json({ error: 'Need player + message' });
  }

  try {
    await rconSend(player, message);
    res.json({ ok: true });
  } catch (e) {
    console.error('[mc-bridge] RCON send failed:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.listen(RELAY_PORT, () => {
  console.log(`[mc-bridge] Relay listener on port ${RELAY_PORT}`);
});

// ─── RCON helper ─────────────────────────────────────────────────
function rconSend(discordUser, text) {
  return new Promise((resolve, reject) => {
    const Rcon = require('rcon');
    const rcon = new Rcon(RCON_PASSWORD, RCON_HOST, RCON_PORT);

    rcon.connect();

    rcon.on('connected', () => {
      const payload = JSON.stringify({
        text: '',
        extra: [
          { text: '[Discord] ', color: 'blue',  bold: true },
          { text: `${discordUser}: `,           color: 'aqua', bold: true },
          { text: text,                         color: 'white' },
        ],
      });
      rcon.send(`tellraw @a ${payload}`);
    });

    rcon.on('response', () => {
      rcon.disconnect();
      resolve();
    });

    rcon.on('error', (err) => {
      reject(err);
    });
  });
}

// ─── boot ────────────────────────────────────────────────────────
startTailer();
console.log('[mc-bridge] running.');
