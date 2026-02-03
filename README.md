# 🎮 Minecraft Discord Bot — Render Edition

One bot. Whitelist + live server status + full chat bridge. Hosted on **Render** for free.

---

## How it works (architecture)

```
┌─────────────────────────┐        ┌──────────────────────────┐
│   Your MC Server        │        │   Render (free web svc)  │
│                         │        │                          │
│  Minecraft process      │        │  bot.js                  │
│  logs/latest.log ───────┼──POST──▶  Express  (port PORT)   │
│                         │  /chat │    GET  /              │
│  mc-bridge.js  ◀────────┼──POST──│    GET  /status        │
│  (sidecar)      RCON    │ /relay │    GET  /whitelist     │
│  listens :8080          │        │    POST /chat          │
└─────────────────────────┘        │                          │
                                   │  Discord client          │
         Discord Users ◀───────────│    slash commands        │
                       ───────────▶│    status embed          │
                                   └──────────────────────────┘
```

* **mc-bridge** runs on your MC machine.  It tails the log and POSTs events to Render.  It also listens for relay messages and pushes them into MC via local RCON.
* **bot.js on Render** runs the Discord client AND an Express server on the same port Render assigns.

---

## Prerequisites

| What | Why |
|---|---|
| Node.js ≥ 20 | Runtime |
| A Discord bot token | [Create one here](https://discord.com/developers/applications) |
| Discord Developer Mode ON | Settings → Advanced → toggle it — so you can copy IDs |
| RCON enabled on your MC server | For Discord → Minecraft chat relay |

### Bot permissions needed when inviting
`Send Messages · Read Messages · Embed Links · Add Reactions`

Tick `bot` + `applications.commands` in the OAuth2 URL Generator.

---

## 1. Deploy the bot to Render

1. **Fork / clone** this repo, or just upload it to a GitHub repo.
2. Go to [render.com](https://render.com) → **New → Blueprint** → paste your repo URL.
3. Render reads `render.yaml` and creates the Web Service + Persistent Disk automatically.
4. In the Render dashboard for the new service, open **Environment** and fill in every `<<<FILL IN>>>` value:

| Env var | Value |
|---|---|
| `DISCORD_TOKEN` | Your bot token from the Developer Portal |
| `STATUS_CHANNEL_ID` | Right-click your status channel → Copy ID |
| `CHAT_CHANNEL_ID` | Right-click your chat channel → Copy ID |
| `ADMIN_ROLE_ID` | Right-click the admin role → Copy ID |
| `OWNER_ID` | Right-click your own username → Copy ID |
| `MC_SERVER_IP` | Public IP or hostname of your MC server |
| `MC_SERVER_PORT` | Usually `25565` |
| `MC_SERVER_DISPLAY_NAME` | Whatever you want the embed title to say |
| `CHAT_WEBHOOK_SECRET` | Any random string (shared with mc-bridge) |
| `MC_RELAY_URL` | `http://<your-mc-ip>:8080/relay` (set after step 2) |
| `MC_RELAY_SECRET` | Any random string (shared with mc-bridge) |

5. Click **Deploy**. The bot comes online — you'll see the status embed appear.

---

## 2. Run mc-bridge on your Minecraft server

`mc-bridge` is a tiny Node script that lives **on the same machine as Minecraft**.

```bash
cd mc-bridge
npm install
cp .env.example .env
# ── edit .env ────────────────────────────────────────────────
# BOT_URL        → copy the Render service URL (e.g. https://mc-discord-bot.onrender.com)
# WEBHOOK_SECRET → same value you put in CHAT_WEBHOOK_SECRET on Render
# MC_LOG_PATH    → path to your logs/latest.log
# RCON_PASSWORD  → from your server.properties
# RELAY_SECRET   → same value you put in MC_RELAY_SECRET on Render
# ─────────────────────────────────────────────────────────────
node mc-bridge.js
```

That's it.  Chat events flow to Discord, Discord messages flow back into MC.

### Keep it running 24/7
Use **pm2** (or any process manager):
```bash
npm install -g pm2
pm2 start mc-bridge.js --name mc-bridge
pm2 save
pm2 startup            # follow the output instructions
```

### Enable RCON (if not already)
In your Minecraft `server.properties`:
```properties
enable-rcon=true
rcon.port=25575
rcon.password=YourRconPassword
```
Restart the MC server after editing.

---

## HTTP Endpoints (exposed by Render)

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Health check — returns `{ status: "ok" }` |
| `GET` | `/status` | Live MC server status as JSON |
| `GET` | `/whitelist` | Current whitelist as JSON |
| `POST` | `/chat` | Receive a chat/join/leave event from mc-bridge |

### POST /chat body
```json
{
  "type": "chat",
  "player": "Steve",
  "message": "hello world"
}
```
`type` is one of `chat`, `join`, or `leave`.  
`message` is required when `type` is `chat`.  
Include the header `X-Webhook-Secret: <CHAT_WEBHOOK_SECRET>` if you set that env var.

---

## Slash Commands

| Command | Who | What |
|---|---|---|
| `/whitelist add <name>` | Admin | Add a player |
| `/whitelist remove <name>` | Admin | Remove a player |
| `/whitelist list` | Anyone | Show the full whitelist |
| `/whitelist check <name>` | Anyone | Check one player |
| `/status` | Anyone | Instant server-status embed |
| `/help` | Anyone | Show all commands |

---

## Project layout

```
mc-discord-bot/
├── bot.js              Entry point (Discord client + Express)
├── http.js             Express routes (/, /status, /whitelist, /chat)
├── config.js           Reads env vars
├── whitelist.js        Read/write whitelist (Persistent Disk)
├── status.js           MC status query + auto-updating embed
├── chat.js             Discord ↔ MC chat logic
├── commands.js         Slash-command registration
├── commands/
│   ├── whitelist.js
│   ├── status.js
│   └── help.js
├── render.yaml         Render blueprint
├── package.json
├── .env.example
│
└── mc-bridge/          ← runs on YOUR MC server, not Render
    ├── mc-bridge.js
    ├── package.json
    └── .env.example
```

---

## Cost

| Resource | Price |
|---|---|
| Render Web Service (free tier) | $0 (sleeps after 15 min of inactivity) |
| Render Persistent Disk (7 GB) | $1 / month |
| Render Starter plan (always-on) | $7 / month (optional upgrade) |
