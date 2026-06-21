# Sabrythos Bot

Bot notifikasi multi-platform yang secara otomatis mengirim pesan ke **Discord** dan **WhatsApp** saat kamu mulai live di **TikTok**.

---

## Fitur

- Deteksi TikTok Live secara otomatis dengan polling interval yang bisa dikonfigurasi
- Notifikasi embed profesional ke channel Discord dengan tombol langsung ke live
- Notifikasi teks ke grup/personal WhatsApp
- Command `%say` untuk mengirim pesan ke channel Discord mana pun
- Semua konfigurasi melalui file `.env` — tidak perlu menyentuh kode
- Berjalan stabil di VPS Linux maupun Windows 10/11

---

## Prasyarat

| Tools     | Versi minimum |
|-----------|---------------|
| Node.js   | 18.x LTS      |
| npm       | 9.x           |
| Git       | 2.x           |

---

## Instalasi & Konfigurasi

### 1. Clone repository

```bash
git clone https://github.com/username/sabrythos-bot.git
cd sabrythos-bot
```

### 2. Install dependencies

```bash
npm install
```

### 3. Buat file `.env`

```bash
cp .env.example .env
```

Buka `.env` dengan editor teks dan isi seluruh nilai yang diperlukan:

```env
DISCORD_TOKEN=MTxxxxxxxxxxxxxxxxxxxxxxxx
DISCORD_NOTIF_CH=1251520983974809660
TIKTOK_USERNAME=erwinxwin3
WA_GROUP_IDS=6283139744987-1620722220@g.us
```

Penjelasan setiap variabel tersedia di dalam file `.env.example`.

### 4. Cari ID Grup WhatsApp (opsional)

Jalankan perintah berikut untuk menampilkan daftar grup beserta ID-nya:

```bash
node -e "
const {Client,LocalAuth}=require('whatsapp-web.js');
const wa=new Client({
  authStrategy:new LocalAuth({clientId:'sabrythos-bot'}),
  puppeteer:{headless:true,args:['--no-sandbox']}
});
wa.on('ready',async()=>{
  const chats=await wa.getChats();
  chats.filter(c=>c.isGroup).forEach(g=>console.log(g.name,'|',g.id._serialized));
  process.exit();
});
wa.initialize();
"
```

Output akan seperti ini:

```
Nama Grup Satu   | 6283139744987-1620722220@g.us
Nama Grup Dua    | 120363405543929769@g.us
```

Copy bagian setelah `|` dan tempel ke `WA_GROUP_IDS` di `.env`.

---

## Cara Menjalankan di Windows 10 / 11

### Persyaratan tambahan

Pastikan Google Chrome atau Chromium sudah terinstall karena dibutuhkan oleh `whatsapp-web.js`.

### Langkah-langkah

1. Install Node.js dari [https://nodejs.org](https://nodejs.org) — pilih versi **LTS**

2. Buka **Command Prompt** atau **PowerShell** sebagai Administrator

3. Masuk ke folder bot:
   ```cmd
   cd C:\Users\NamaKamu\sabrythos-bot
   ```

4. Jalankan bot:
   ```cmd
   npm start
   ```

5. Pertama kali berjalan, terminal akan menampilkan QR code. Scan menggunakan WhatsApp:
   - WhatsApp → **Perangkat Tertaut** → **Tautkan Perangkat** → Scan QR

6. Setelah berhasil, sesi WhatsApp tersimpan di folder `.wwebjs_auth/` sehingga tidak perlu scan ulang setiap restart.

### Menjalankan otomatis saat Windows startup (opsional)

Gunakan **Task Scheduler** atau install `pm2`:

```cmd
npm install -g pm2
pm2 start index.js --name sabrythos-bot
pm2 startup
pm2 save
```

---

## Cara Menjalankan di VPS Linux (AAPanel / Ubuntu / Debian)

### Persyaratan tambahan

`whatsapp-web.js` membutuhkan Chromium dan beberapa library sistem. Install dengan:

```bash
# Ubuntu / Debian
sudo apt update
sudo apt install -y \
  chromium-browser \
  libatk-bridge2.0-0 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libasound2 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  fonts-liberation \
  libappindicator3-1 \
  xdg-utils
```

### Langkah-langkah

#### 1. Install Node.js via nvm (disarankan)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install --lts
nvm use --lts
node -v  # pastikan >=18
```

#### 2. Clone dan setup bot

```bash
git clone https://github.com/username/sabrythos-bot.git
cd sabrythos-bot
npm install
cp .env.example .env
nano .env  # isi semua nilai
```

#### 3. Scan QR WhatsApp via terminal

Saat pertama kali dijalankan, QR code akan muncul di terminal. Karena di VPS tidak ada browser, gunakan link alternatif yang dicetak:

```
https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=...
```

Buka link tersebut di browser lokal kamu, lalu scan QR-nya dengan WhatsApp.

#### 4. Jalankan dengan PM2 (agar tetap berjalan setelah terminal ditutup)

```bash
npm install -g pm2

# Jalankan bot
pm2 start index.js --name sabrythos-bot

# Simpan agar auto-start setelah reboot VPS
pm2 startup
pm2 save
```

#### Perintah PM2 yang berguna

```bash
pm2 status                        # lihat status semua proses
pm2 logs sabrythos-bot            # lihat log real-time
pm2 logs sabrythos-bot --lines 50 # lihat 50 baris log terakhir
pm2 restart sabrythos-bot         # restart bot
pm2 stop sabrythos-bot            # stop bot
pm2 delete sabrythos-bot          # hapus dari PM2
```

### Menjalankan di AAPanel

1. Masuk ke AAPanel → **App Store** → Install **Node.js** versi 18 atau 20
2. Buka **Terminal** di AAPanel
3. Ikuti langkah clone, npm install, dan konfigurasi `.env` seperti di atas
4. Gunakan PM2 seperti di atas, atau gunakan fitur **Process Manager** bawaan AAPanel jika tersedia

---

## Commands Discord

| Command | Permission | Deskripsi |
|---------|-----------|-----------|
| `%say #channel pesan` | Manage Messages | Kirim pesan plain text ke channel tujuan |

---

## Struktur File

```
sabrythos-bot/
├── index.js          # Kode utama bot
├── package.json
├── .env.example      # Template konfigurasi
├── .env              # Konfigurasi aktual (tidak di-commit)
├── .gitignore
└── .wwebjs_auth/     # Sesi WhatsApp (auto-generated)
```

---

## Troubleshooting

**Bot Discord tidak merespons command**
- Pastikan `MESSAGE CONTENT INTENT` diaktifkan di Discord Developer Portal → Bot → Privileged Gateway Intents

**WhatsApp QR tidak muncul atau gagal scan**
- Hapus folder `.wwebjs_auth/` lalu restart bot untuk generate QR baru
- Pastikan WhatsApp di HP tidak sedang terhubung ke perangkat lain yang melebihi batas

**TikTok tidak terdeteksi live**
- Pastikan `TIKTOK_USERNAME` diisi tanpa `@`
- Coba kurangi `TIKTOK_CHECK_MS` menjadi `30000` untuk interval lebih cepat
- Akun TikTok perlu cukup followers agar live bisa dideteksi via API publik

**Error `ECONNREFUSED` atau Puppeteer crash di VPS**
- Pastikan semua dependency sistem sudah terinstall (lihat bagian Prasyarat di atas)
- Tambahkan `--no-sandbox` sudah ada di konfigurasi, tapi pastikan VPS tidak memblokir proses headless browser

---

## Lisensi

MIT
# live-notification-bot
