// ─── whitelist.js ────────────────────────────────────────────────
// Stores the whitelist in a JSON file on a Render Persistent Disk.
// Falls back to an in-memory array when the disk path is not writable
// (handy for local development without /data).

const fs   = require('fs');
const path = require('path');
const config = require('./config');

const WL_PATH = config.WHITELIST_PATH;   // default: /data/whitelist.json
let diskAvailable = true;                 // flipped to false if we can't write

// ─── in-memory fallback ──────────────────────────────────────────
let memList = [];

// ─── bootstrap ───────────────────────────────────────────────────
function initWhitelist() {
  try {
    // Make sure the parent directory exists (e.g. /data)
    const dir = path.dirname(WL_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // If the file doesn't exist yet, create it with an empty array
    if (!fs.existsSync(WL_PATH)) {
      fs.writeFileSync(WL_PATH, '[]');
    }
    // Warm the in-memory cache
    memList = JSON.parse(fs.readFileSync(WL_PATH, 'utf8'));
    console.log(`[Whitelist] Loaded ${memList.length} player(s) from ${WL_PATH}`);
  } catch (err) {
    diskAvailable = false;
    console.warn('[Whitelist] Persistent disk not available — using in-memory storage.');
    console.warn('            Changes will be lost on redeploy unless you add a Persistent Disk.');
  }
}

// ─── read / write ────────────────────────────────────────────────
function readList() {
  return memList;                         // always return in-memory copy (fast)
}

function writeList(list) {
  memList = list;                         // update in-memory
  if (diskAvailable) {
    try {
      fs.writeFileSync(WL_PATH, JSON.stringify(list, null, 2));
    } catch (err) {
      console.error('[Whitelist] Write failed:', err.message);
    }
  }
}

// ─── public API ──────────────────────────────────────────────────

function isWhitelisted(playerName) {
  return memList.some((p) => p.name.toLowerCase() === playerName.toLowerCase());
}

function addPlayer(playerName, addedBy) {
  if (isWhitelisted(playerName)) {
    return { success: false, message: `\`${playerName}\` is already whitelisted.` };
  }
  const list = readList();
  list.push({ name: playerName, addedBy, addedAt: new Date().toISOString() });
  writeList(list);
  return { success: true, message: `✅ \`${playerName}\` has been added to the whitelist.` };
}

function removePlayer(playerName) {
  const list = readList();
  const idx  = list.findIndex((p) => p.name.toLowerCase() === playerName.toLowerCase());
  if (idx === -1) {
    return { success: false, message: `\`${playerName}\` is not on the whitelist.` };
  }
  list.splice(idx, 1);
  writeList(list);
  return { success: true, message: `🗑️ \`${playerName}\` has been removed from the whitelist.` };
}

function getList() {
  return readList();
}

module.exports = { initWhitelist, isWhitelisted, addPlayer, removePlayer, getList };
