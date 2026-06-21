'use strict';

require('dotenv').config();

const {
  Client: DiscordClient,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ActivityType,
} = require('discord.js');

const { TikTokLiveConnection }        = require('tiktok-live-connector');
const { Client: WAClient, LocalAuth } = require('whatsapp-web.js');
const qrcode                          = require('qrcode-terminal');

// ─────────────────────────────────────────────────────────
//  CONFIG — loaded from .env
// ─────────────────────────────────────────────────────────

const CONFIG = {
  discord: {
    token:   process.env.DISCORD_TOKEN,
    prefix:  process.env.DISCORD_PREFIX   || '%',
    notifCh: process.env.DISCORD_NOTIF_CH,
  },
  tiktok: {
    username:  process.env.TIKTOK_USERNAME,
    checkMs:   parseInt(process.env.TIKTOK_CHECK_MS || '60000', 10),
    bannerUrl: process.env.TIKTOK_BANNER_URL || '',
  },
  whatsapp: {
    groupIds:    (process.env.WA_GROUP_IDS    || '').split(',').map(s => s.trim()).filter(Boolean),
    personalIds: (process.env.WA_PERSONAL_IDS || '').split(',').map(s => s.trim()).filter(Boolean),
  },
};

// ─────────────────────────────────────────────────────────
//  VALIDATION
// ─────────────────────────────────────────────────────────

function validateConfig() {
  const required = [
    ['DISCORD_TOKEN',   CONFIG.discord.token],
    ['DISCORD_NOTIF_CH', CONFIG.discord.notifCh],
    ['TIKTOK_USERNAME', CONFIG.tiktok.username],
  ];

  const missing = required.filter(([, v]) => !v).map(([k]) => k);

  if (missing.length > 0) {
    console.error(`\n[CONFIG] Missing required environment variables:\n  ${missing.join('\n  ')}`);
    console.error('\nCopy .env.example → .env and fill in the values.\n');
    process.exit(1);
  }
}

validateConfig();

// ─────────────────────────────────────────────────────────
//  PALETTE
// ─────────────────────────────────────────────────────────

const COLOR = {
  LIVE:    0xFE2C55,  // TikTok red
  OFFLINE: 0x2C2C2C,
  SUCCESS: 0x25D366,  // WhatsApp green
  ERROR:   0xED4245,
  INFO:    0x5865F2,  // Discord blurple
};

// ─────────────────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────────────────

const state = {
  tiktok: {
    live:       false,
    conn:       null,
    notifSent:  false,
    liveStart:  null,
  },
  whatsapp: {
    ready: false,
  },
};

// ─────────────────────────────────────────────────────────
//  DISCORD
// ─────────────────────────────────────────────────────────

const discord = new DiscordClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// ─────────────────────────────────────────────────────────
//  WHATSAPP
// ─────────────────────────────────────────────────────────

const wa = new WAClient({
  authStrategy: new LocalAuth({ clientId: 'sabrythos-bot' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

wa.on('qr', (qr) => {
  console.log('\n══════════════════════════════════════════');
  console.log('  📱  Scan QR Code berikut dengan WhatsApp');
  console.log('══════════════════════════════════════════\n');
  qrcode.generate(qr, { small: true });
  console.log('\nAtau buka link ini di browser:');
  console.log(`  https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}\n`);
  console.log('WhatsApp → Perangkat Tertaut → Tautkan Perangkat → Scan\n');
});

wa.on('ready', () => {
  state.whatsapp.ready = true;
  const name = wa.info.pushname;
  const num  = wa.info.wid.user;
  console.log(`[WA]      ✓ Connected  →  ${name} (+${num})`);
});

wa.on('auth_failure', (msg)  => console.error('[WA]      ✗ Auth failed:', msg));
wa.on('disconnected',  (reason) => {
  state.whatsapp.ready = false;
  console.warn('[WA]      ⚡ Disconnected:', reason);
});

// ─────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────

function formatTime(date) {
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' });
}

function formatDate(date) {
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
    year:    'numeric',
    timeZone: 'Asia/Makassar',
  });
}

// ─────────────────────────────────────────────────────────
//  DISCORD LIVE NOTIFICATION
// ─────────────────────────────────────────────────────────

async function sendDiscordLiveNotif() {
  const ch = await discord.channels.fetch(CONFIG.discord.notifCh).catch(() => null);
  if (!ch) {
    console.error('[DISCORD] Channel not found:', CONFIG.discord.notifCh);
    return;
  }

  const now     = new Date();
  const timeStr = formatTime(now);
  const dateStr = formatDate(now);
  const liveUrl = `https://www.tiktok.com/@${CONFIG.tiktok.username}/live`;
  const profUrl = `https://www.tiktok.com/@${CONFIG.tiktok.username}`;

  const embed = new EmbedBuilder()
    .setColor(COLOR.LIVE)
    .setAuthor({
      name:    'TIKTOK LIVE  •  ON AIR',
      iconURL: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a9/TikTok_logo.svg/200px-TikTok_logo.svg.png',
    })
    .setTitle(`@${CONFIG.tiktok.username} sedang LIVE sekarang!`)
    .setDescription(
      `> Hai semua, **${CONFIG.tiktok.username}** baru aja mulai live!\n` +
      `> Yuk langsung gabung dan ramaikan stream-nya. 🔥\n\n` +
      `**🕐 Mulai pukul**\n\`${timeStr} WITA  •  ${dateStr}\`\n\n` +
      `**📍 Platform**\n\`TikTok Live\``
    )
    .setFooter({
      text:    'Sabrythos Live Notifier',
      iconURL: discord.user?.displayAvatarURL(),
    })
    .setTimestamp();

  if (CONFIG.tiktok.bannerUrl) {
    embed.setImage(CONFIG.tiktok.bannerUrl);
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Tonton Live')
      .setEmoji('🔴')
      .setStyle(ButtonStyle.Link)
      .setURL(liveUrl),
    new ButtonBuilder()
      .setLabel('Kunjungi Profil')
      .setEmoji('👤')
      .setStyle(ButtonStyle.Link)
      .setURL(profUrl),
  );

  await ch.send({
    content:    `@everyone — 🔴 **@${CONFIG.tiktok.username} baru aja mulai LIVE!**`,
    embeds:     [embed],
    components: [row],
  });

  console.log('[DISCORD] ✓ Live notification sent');
}

// ─────────────────────────────────────────────────────────
//  WHATSAPP LIVE NOTIFICATION
// ─────────────────────────────────────────────────────────

async function sendWhatsAppLiveNotif() {
  if (!state.whatsapp.ready) {
    console.warn('[WA]      ⚠  Not ready, skipping notification');
    return;
  }

  const now     = new Date();
  const timeStr = formatTime(now);
  const dateStr = formatDate(now);

  const message =
    `🔴 *LIVE SEKARANG!*\n\n` +
    `*@${CONFIG.tiktok.username}* baru aja mulai LIVE di TikTok!\n` +
    `Yuk langsung gabung dan ramaikan! 🔥\n\n` +
    `🕐 *Mulai :* ${timeStr} WITA\n` +
    `📅 *Tanggal :* ${dateStr}\n\n` +
    `▶️ *Tonton sekarang:*\n` +
    `https://www.tiktok.com/@${CONFIG.tiktok.username}/live`;

  const targets = [
    ...CONFIG.whatsapp.groupIds.map(id    => ({ id, label: `group ${id}` })),
    ...CONFIG.whatsapp.personalIds.map(id => ({ id, label: id })),
  ];

  await Promise.allSettled(
    targets.map(async ({ id, label }) => {
      try {
        await wa.sendMessage(id, message);
        console.log(`[WA]      ✓ Sent to ${label}`);
      } catch (err) {
        console.error(`[WA]      ✗ Failed to send to ${label}:`, err.message);
      }
    })
  );
}

// ─────────────────────────────────────────────────────────
//  TIKTOK LIVE POLLER
// ─────────────────────────────────────────────────────────

async function pollTikTokLive() {
  if (state.tiktok.conn) return;

  const conn = new TikTokLiveConnection(CONFIG.tiktok.username, {
    processInitialData:       false,
    fetchRoomInfoOnConnect:   true,
    enableExtendedGiftInfo:   false,
    enableWebsocketUpgrade:   true,
    requestPollingIntervalMs: 2000,
    sessionId:                undefined,
  });

  try {
    await conn.connect();

    state.tiktok.conn      = conn;
    state.tiktok.live      = true;
    state.tiktok.liveStart = new Date();

    console.log(`[TIKTOK]  ✓ Connected to @${CONFIG.tiktok.username}'s live`);
    discord.user?.setActivity(`🔴 @${CONFIG.tiktok.username} is LIVE`, { type: ActivityType.Watching });

    if (!state.tiktok.notifSent) {
      state.tiktok.notifSent = true;
      await Promise.allSettled([sendDiscordLiveNotif(), sendWhatsAppLiveNotif()]);
    }

    conn.on('disconnected', () => {
      console.log('[TIKTOK]  — Live ended');
      discord.user?.setActivity('🔴 Waiting for Live...', { type: ActivityType.Watching });
      state.tiktok.live      = false;
      state.tiktok.conn      = null;
      state.tiktok.notifSent = false;
      state.tiktok.liveStart = null;
    });

    conn.on('error', (err) => console.error('[TIKTOK]  ✗ Error:', err?.message || err));

  } catch {
    if (state.tiktok.live) {
      state.tiktok.live      = false;
      state.tiktok.conn      = null;
      state.tiktok.notifSent = false;
      state.tiktok.liveStart = null;
    }
  }
}

// ─────────────────────────────────────────────────────────
//  COMMAND: %say
// ─────────────────────────────────────────────────────────

async function cmdSay(message, args) {
  if (!message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) {
    return message.reply('❌ Kamu tidak punya permission **Manage Messages** untuk menggunakan perintah ini.');
  }

  if (args.length < 2) {
    return message.reply(
      '**Cara pakai `%say`:**\n' +
      '```\n%say #channel pesan kamu di sini\n%say channel-id pesan kamu di sini\n```'
    );
  }

  const channelId = args[0].replace(/[<#>]/g, '');
  const text      = args.slice(1).join(' ');

  let targetCh;
  try {
    targetCh = await discord.channels.fetch(channelId);
  } catch {
    return message.reply(`❌ Channel \`${args[0]}\` tidak ditemukan.`);
  }

  try {
    await targetCh.send(text);
    await message.delete().catch(() => {});
  } catch {
    message.reply(`❌ Bot tidak punya akses untuk mengirim pesan ke <#${channelId}>.`);
  }
}

// ─────────────────────────────────────────────────────────
//  DISCORD EVENT: MESSAGE
// ─────────────────────────────────────────────────────────

discord.on('messageCreate', async (message) => {
  if (message.author.bot)                                  return;
  if (!message.content.startsWith(CONFIG.discord.prefix)) return;

  const raw     = message.content.slice(CONFIG.discord.prefix.length).trim();
  const parts   = raw.split(/\s+/);
  const command = parts.shift().toLowerCase();
  const args    = parts;

  try {
    switch (command) {
      case 'say':
        await cmdSay(message, args);
        break;
    }
  } catch (err) {
    console.error(`[DISCORD] Command error (%${command}):`, err);
    message.reply('❌ Terjadi error saat menjalankan perintah.').catch(() => {});
  }
});

// ─────────────────────────────────────────────────────────
//  DISCORD EVENT: READY
// ─────────────────────────────────────────────────────────

discord.once('ready', () => {
  const pad = (s, n = 20) => String(s).padEnd(n);

  console.log('\n╔══════════════════════════════════════╗');
  console.log('  Sabrythos Bot  —  ONLINE');
  console.log('╠══════════════════════════════════════╣');
  console.log(`  ${pad('Discord')}  ${discord.user.tag}`);
  console.log(`  ${pad('Servers')}  ${discord.guilds.cache.size}`);
  console.log(`  ${pad('TikTok target')}  @${CONFIG.tiktok.username}`);
  console.log(`  ${pad('Poll interval')}  ${CONFIG.tiktok.checkMs / 1000}s`);
  console.log('╚══════════════════════════════════════╝\n');

  discord.user.setActivity('🔴 Waiting for Live...', { type: ActivityType.Watching });

  // Start polling — first check delayed by 15 s to let WhatsApp initialize
  setTimeout(pollTikTokLive,               15_000);
  setInterval(pollTikTokLive, CONFIG.tiktok.checkMs);
});

discord.on('error', (err) => console.error('[DISCORD] ✗ Client error:', err));

// ─────────────────────────────────────────────────────────
//  GLOBAL ERROR HANDLERS
// ─────────────────────────────────────────────────────────

process.on('unhandledRejection', (reason) => {
  console.error('[PROCESS]  Unhandled rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[PROCESS]  Uncaught exception:', err);
  process.exit(1);
});

// ─────────────────────────────────────────────────────────
//  BOOTSTRAP
// ─────────────────────────────────────────────────────────

console.log('\n🚀  Starting Sabrythos Bot...\n');
wa.initialize();
discord.login(CONFIG.discord.token);