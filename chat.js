// ─── chat.js ─────────────────────────────────────────────────────
// Render cannot reach a local file, so log-tailing is gone.
// Instead your Minecraft server POSTs events to  POST /chat
// (see http.js).  This module owns the Discord-side logic:
//   • postToDiscord(type, payload)   – called by the HTTP route
//   • relayToMinecraft(message)      – called when someone types in the chat channel
//
// Discord → Minecraft relay
// ─────────────────────────
// Render also can't open a raw TCP RCON socket reliably.
// Instead we POST the message to an HTTP endpoint YOU expose
// on your MC server.  Options that work out of the box:
//   • Bukkit plugin with a tiny HTTP server (e.g. "Webhook" or custom)
//   • A small Node/Python sidecar on your MC box that accepts POST and
//     forwards via RCON locally.
// Set  MC_RELAY_URL  in your env to that endpoint.
// If it's blank the relay is simply skipped.

const { EmbedBuilder } = require('discord.js');
const config = require('./config');

// ─── Discord ← Minecraft ─────────────────────────────────────────
// type: "chat" | "join" | "leave"
// payload: { player, message? }
async function postToDiscord(client, type, payload) {
  const channel = client.channels.cache.get(config.CHAT_CHANNEL_ID);
  if (!channel) {
    console.warn('[Chat] CHAT_CHANNEL_ID not found, dropping event.');
    return;
  }

  if (type === 'chat') {
    const embed = new EmbedBuilder()
      .setColor(config.COLOR_INFO)
      .setAuthor({
        name: payload.player,
        iconURL: `https://api.dicebear.com/7.x/minecraft/svg?seed=${encodeURIComponent(payload.player)}`,
      })
      .setDescription(payload.message)
      .setTimestamp();
    await channel.send({ embeds: [embed] });
    return;
  }

  if (type === 'join') {
    await channel.send(`🟢 **${payload.player}** joined the game.`);
    return;
  }

  if (type === 'leave') {
    await channel.send(`🔴 **${payload.player}** left the game.`);
    return;
  }

  console.warn(`[Chat] Unknown event type: ${type}`);
}

// ─── Discord → Minecraft ─────────────────────────────────────────
async function relayToMinecraft(message) {
  const url = process.env.MC_RELAY_URL;   // e.g. http://your-mc-box:8080/relay
  if (!url) {
    // Silently skip — user hasn't set up a relay endpoint
    return;
  }

  try {
    const body = JSON.stringify({
      player:  message.author.username,
      message: message.content,
    });

    const res = await fetch(url, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'X-Relay-Secret': process.env.MC_RELAY_SECRET || '',
      },
      body,
    });

    if (!res.ok) {
      console.error(`[Chat] Relay returned ${res.status}: ${await res.text()}`);
      await message.react('❌');
    }
  } catch (err) {
    console.error('[Chat] Relay fetch failed:', err.message);
    await message.react('❌');
  }
}

module.exports = { postToDiscord, relayToMinecraft };
