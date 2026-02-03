// ─── commands.js ─────────────────────────────────────────────────
// Registers slash commands with the first guild the bot is in.
// Guild-scoped registration is instant (no 1-hour global delay).

const { SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Manage the server whitelist')
    .addSubcommand((s) =>
      s.setName('add').setDescription('Add a player to the whitelist')
        .addStringOption((o) => o.setName('player').setDescription('Minecraft username').setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName('remove').setDescription('Remove a player from the whitelist')
        .addStringOption((o) => o.setName('player').setDescription('Minecraft username').setRequired(true))
    )
    .addSubcommand((s) => s.setName('list').setDescription('Show everyone on the whitelist'))
    .addSubcommand((s) =>
      s.setName('check').setDescription('Check if a player is whitelisted')
        .addStringOption((o) => o.setName('player').setDescription('Minecraft username').setRequired(true))
    ),

  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Get the current server status right now'),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all bot commands'),
];

async function registerCommands(client) {
  const guild = client.guilds.cache.first();
  if (!guild) {
    console.error('[Commands] No guild — cannot register slash commands.');
    return;
  }
  await guild.commands.set(commands);
  console.log(`[Commands] Registered ${commands.length} slash command(s)`);
}

module.exports = { registerCommands };
