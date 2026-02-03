// ─── commands/whitelist.js ───────────────────────────────────────
const { EmbedBuilder } = require('discord.js');
const config          = require('../config');
const { addPlayer, removePlayer, getList, isWhitelisted } = require('../whitelist');

function isAdmin(interaction) {
  if (interaction.user.id === config.OWNER_ID) return true;
  if (config.ADMIN_ROLE_ID && interaction.member?.roles?.cache?.has(config.ADMIN_ROLE_ID)) return true;
  return false;
}

async function execute(interaction) {
  const sub = interaction.options.getSubcommand();

  // ── list ─────────────────────────────────────────────────────
  if (sub === 'list') {
    const list = getList();
    const embed = new EmbedBuilder()
      .setTitle('📋 Whitelist')
      .setColor(config.COLOR_INFO)
      .setTimestamp();

    if (list.length === 0) {
      embed.setDescription('The whitelist is currently **empty**.');
    } else {
      embed.setDescription(list.map((p, i) => `${i + 1}. \`${p.name}\``).join('\n'));
      embed.setFooter({ text: `${list.length} player${list.length !== 1 ? 's' : ''} whitelisted` });
    }
    return interaction.reply({ embeds: [embed] });
  }

  // ── check ────────────────────────────────────────────────────
  if (sub === 'check') {
    const player = interaction.options.getString('player');
    return interaction.reply({
      content: isWhitelisted(player)
        ? `✅ \`${player}\` **is** on the whitelist.`
        : `❌ \`${player}\` is **not** on the whitelist.`,
      ephemeral: true,
    });
  }

  // ── add / remove — admin only ────────────────────────────────
  if (!isAdmin(interaction)) {
    return interaction.reply({ content: '🚫 Only admins can modify the whitelist.', ephemeral: true });
  }

  const player = interaction.options.getString('player');

  if (sub === 'add') {
    const r = addPlayer(player, interaction.user.username);
    return interaction.reply({ content: r.message, ephemeral: !r.success });
  }

  if (sub === 'remove') {
    const r = removePlayer(player);
    return interaction.reply({ content: r.message, ephemeral: !r.success });
  }
}

module.exports = { execute };
