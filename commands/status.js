// ─── commands/status.js ──────────────────────────────────────────
const { EmbedBuilder } = require('discord.js');
const config          = require('../config');
const { queryServer } = require('../status');

async function execute(interaction) {
  await interaction.deferReply();

  const data = await queryServer();

  const embed = new EmbedBuilder()
    .setTitle(`${data.online ? '🟢' : '🔴'} ${config.MC_SERVER_DISPLAY_NAME} — Live Status`)
    .setColor(data.online ? config.COLOR_ONLINE : config.COLOR_OFFLINE)
    .setTimestamp();

  if (!data.online) {
    embed.setDescription('Server is **offline** or unreachable.');
  } else {
    embed.setDescription(data.description || 'No description.');
    const names =
      data.players.sample?.length
        ? data.players.sample.map((p) => `\`${p.name}\``).join(', ')
        : 'No players online';

    embed.addFields(
      { name: '👥 Players',       value: `${data.players.online} / ${data.players.max}`, inline: true },
      { name: '📡 Latency',       value: `${data.latency} ms`,                           inline: true },
      { name: '📦 Version',       value: data.version,                                   inline: true },
      { name: '🎮 Who\'s Online', value: names,                                          inline: false },
    );
  }

  await interaction.editReply({ embeds: [embed] });
}

module.exports = { execute };
