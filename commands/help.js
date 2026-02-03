// ─── commands/help.js ────────────────────────────────────────────
const { EmbedBuilder } = require('discord.js');
const config          = require('../config');

async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('🤖 Bot Commands & Endpoints')
    .setColor(config.COLOR_INFO)
    .setDescription('Everything this bot can do:')
    .addFields(
      {
        name: '📋 Whitelist',
        value:
          '`/whitelist add <player>` — Add a player *(admin)*\n' +
          '`/whitelist remove <player>` — Remove a player *(admin)*\n' +
          '`/whitelist list` — View the full whitelist\n' +
          '`/whitelist check <player>` — Check if someone is whitelisted',
      },
      {
        name: '🟢 Server Status',
        value:
          '`/status` — Instant server status\n' +
          'A live embed also auto-updates every 30 seconds in the status channel.\n' +
          '`GET /status` — same data as JSON via HTTP',
      },
      {
        name: '💬 Chat Bridge',
        value:
          'Your MC server POSTs chat events to `POST /chat`.\n' +
          'Type in the chat channel to send a message back into Minecraft.\n' +
          '`GET /whitelist` — current whitelist as JSON via HTTP',
      },
    )
    .setFooter({ text: 'Admin commands require the configured admin role.' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

module.exports = { execute };
