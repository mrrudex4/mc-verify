// ─── bot.js ──────────────────────────────────────────────────────
// Single entry point.  Starts:
//   1. Express HTTP server  (keeps the Render instance alive + exposes endpoints)
//   2. Discord client       (slash commands, status monitor, chat relay)

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const config              = require('./config');
const { initWhitelist }   = require('./whitelist');
const { startStatusMonitor } = require('./status');
const { relayToMinecraft }   = require('./chat');
const { registerCommands }   = require('./commands');
const { startHTTP }          = require('./http');

// ─── Discord client ──────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

// ─── ready ───────────────────────────────────────────────────────
client.once('ready', async () => {
  console.log(`✅ Discord — logged in as ${client.user.tag}`);

  // 1. Register slash commands (guild-scoped = instant)
  await registerCommands(client);

  // 2. Boot whitelist (reads from Persistent Disk or in-memory fallback)
  initWhitelist();

  // 3. Start the auto-updating status embed
  startStatusMonitor(client);

  // 4. Start the HTTP server — also receives /chat POSTs from MC
  startHTTP(client);
});

// ─── slash commands ──────────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  try {
    const cmd = require(`./commands/${interaction.commandName}`);
    await cmd.execute(interaction, client);
  } catch (err) {
    console.error(`[Cmd] ${interaction.commandName} error:`, err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Something went wrong.', ephemeral: true });
    }
  }
});

// ─── Discord → Minecraft relay ───────────────────────────────────
client.on('messageCreate', async (message) => {
  if (message.channelId !== config.CHAT_CHANNEL_ID) return;
  if (message.author.id === client.user.id)          return;   // ignore self
  if (message.content.startsWith('/'))               return;   // ignore slash commands

  await relayToMinecraft(message);
});

// ─── login ───────────────────────────────────────────────────────
client.login(config.DISCORD_TOKEN);
