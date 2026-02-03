// ─── status.js ───────────────────────────────────────────────────
// Queries the Minecraft server every N seconds and edits a single
// Discord embed in place.  Also exports queryServer() so the slash
// command and the HTTP GET /status endpoint can use it.

const { EmbedBuilder } = require('discord.js');
const config = require('./config');

let statusMessageId = null;   // cached so we edit instead of spamming

// ─── query ───────────────────────────────────────────────────────
async function queryServer() {
  const { status } = require('minecraft-server-util');
  try {
    const res = await status(config.MC_SERVER_IP, config.MC_SERVER_PORT, { timeout: 5000 });
    return {
      online:      true,
      latency:     res.latency,
      players:     res.players,                                          // { online, max, sample }
      version:     res.version?.name || 'Unknown',
      description: stripColor(res.description?.text || res.description || ''),
    };
  } catch (err) {
    return { online: false, error: err.message };
  }
}

function stripColor(str) {
  return String(str).replace(/§[0-9a-fk-or]/gi, '');
}

// ─── embed builder ───────────────────────────────────────────────
function buildEmbed(data) {
  const embed = new EmbedBuilder()
    .setTitle(`${data.online ? '🟢' : '🔴'} ${config.MC_SERVER_DISPLAY_NAME}`)
    .setColor(data.online ? config.COLOR_ONLINE : config.COLOR_OFFLINE)
    .setTimestamp();

  if (!data.online) {
    embed.setDescription('Server is **offline** or unreachable.');
    return embed;
  }

  embed.setDescription(data.description || 'No description set.');

  const playerNames =
    data.players.sample?.length
      ? data.players.sample.map((p) => `\`${p.name}\``).join(', ')
      : 'No players online';

  embed.addFields(
    { name: '👥 Players',    value: `${data.players.online} / ${data.players.max}`, inline: true },
    { name: '📡 Latency',    value: `${data.latency} ms`,                           inline: true },
    { name: '📦 Version',    value: data.version,                                   inline: true },
    { name: '🎮 Who\'s Online', value: playerNames,                                 inline: false },
  );

  embed.setFooter({ text: `Updates every ${config.STATUS_CHECK_INTERVAL_MS / 1000}s` });
  return embed;
}

// ─── auto-update loop ────────────────────────────────────────────
async function startStatusMonitor(client) {
  const channel = client.channels.cache.get(config.STATUS_CHANNEL_ID);
  if (!channel) {
    console.error('[Status] STATUS_CHANNEL_ID not found or bot has no access.');
    return;
  }

  async function tick() {
    try {
      const data  = await queryServer();
      const embed = buildEmbed(data);

      if (statusMessageId) {
        const msg = await channel.messages.fetch(statusMessageId);
        await msg.edit({ embeds: [embed] });
      } else {
        const msg = await channel.send({ embeds: [embed] });
        statusMessageId = msg.id;
        console.log(`[Status] Embed posted (id ${msg.id})`);
      }
    } catch (err) {
      console.error('[Status] tick error:', err.message);
      statusMessageId = null;   // reset so we post fresh next time
    }
  }

  await tick();
  setInterval(tick, config.STATUS_CHECK_INTERVAL_MS);
  console.log(`[Status] Monitor running every ${config.STATUS_CHECK_INTERVAL_MS / 1000}s`);
}

module.exports = { startStatusMonitor, queryServer, buildEmbed };
