const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

// Bot token
const TOKEN = '8892528586:AAEaME8MITeJITS2hyIgRDbzkJexZ67dnKk';
const ALLOWED_ID = '8883765968';
const KEYS_FILE = path.join(__dirname, 'keys.json');

// Bot oluştur
const bot = new TelegramBot(TOKEN, { polling: true });

// Key dosyasını oku
function loadKeys() {
    try {
        if (fs.existsSync(KEYS_FILE)) {
            return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
        }
    } catch (e) {}
    return {};
}

// Key dosyasını kaydet
function saveKeys(keys) {
    fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2));
}

// Key oluştur
function generateKey() {
    const prefix = 'TRX';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = prefix;
    for (let i = 0; i < 24; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
        if (i % 4 === 3 && i < 23) result += '-';
    }
    return result;
}

// Key süresi (30 gün)
function getExpiry() {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString();
}

// Ana komutlar
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = String(msg.from.id);
    
    bot.sendMessage(chatId, 
        `🔐 *TREXA SPY Key Sistemi*

🤖 Merhaba! Bu bot ile Trexa Spy sistemine giriş yapmak için key alabilirsin.

📌 *Komutlar:*
/keyolustur - Yeni anahtar oluştur
/keylerim - Anahtarlarını listele
/keyiptal ANAHTAR - Anahtar iptal et

⚠️ *Not:* Sadece yetkili kişiler key oluşturabilir.`,
        { parse_mode: 'Markdown' }
    );
});

// Key oluştur
bot.onText(/\/keyolustur/, (msg) => {
    const chatId = msg.chat.id;
    const userId = String(msg.from.id);
    
    // Yetki kontrolü
    if (userId !== ALLOWED_ID) {
        bot.sendMessage(chatId, 
            '❌ *Yetkisiz Erişim!*\n\nBu komutu kullanma yetkiniz yok.\nSadece yetkili yöneticiler key oluşturabilir.',
            { parse_mode: 'Markdown' }
        );
        return;
    }
    
    // Key oluştur
    const keys = loadKeys();
    const key = generateKey();
    const expiry = getExpiry();
    
    keys[key] = {
        created: new Date().toISOString(),
        expiry: expiry,
        createdBy: userId,
        active: true
    };
    
    saveKeys(keys);
    
    bot.sendMessage(chatId,
        `✅ *Yeni Anahtar Oluşturuldu!*

🔑 *Anahtar:* \`${key}\`
📅 *Son Kullanma:* ${new Date(expiry).toLocaleString('tr-TR')}
👤 *Oluşturan:* ${userId}

⚠️ Bu anahtarı kimseyle paylaşmayın!
Siteye giriş yapmak için kullanın.`,
        { parse_mode: 'Markdown' }
    );
});

// Key listele
bot.onText(/\/keylerim/, (msg) => {
    const chatId = msg.chat.id;
    const userId = String(msg.from.id);
    
    if (userId !== ALLOWED_ID) {
        bot.sendMessage(chatId, '❌ Yetkisiz erişim!', { parse_mode: 'Markdown' });
        return;
    }
    
    const keys = loadKeys();
    const entries = Object.entries(keys);
    
    if (entries.length === 0) {
        bot.sendMessage(chatId, '📭 Henüz oluşturulmuş anahtar yok.', { parse_mode: 'Markdown' });
        return;
    }
    
    let msg = '📋 *Mevcut Anahtarlar:*\n\n';
    entries.forEach(([key, data], i) => {
        const isValid = new Date() < new Date(data.expiry);
        const status = isValid ? '✅ Aktif' : '❌ Süresi doldu';
        msg += `${i+1}. \`${key}\` - ${status}\n`;
        msg += `   📅 ${new Date(data.expiry).toLocaleString('tr-TR')}\n`;
    });
    
    bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
});

// Key iptal
bot.onText(/\/keyiptal (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = String(msg.from.id);
    const keyToDelete = match[1].trim().toUpperCase();
    
    if (userId !== ALLOWED_ID) {
        bot.sendMessage(chatId, '❌ Yetkisiz erişim!', { parse_mode: 'Markdown' });
        return;
    }
    
    const keys = loadKeys();
    if (keys[keyToDelete]) {
        delete keys[keyToDelete];
        saveKeys(keys);
        bot.sendMessage(chatId,
            `✅ \`${keyToDelete}\` anahtarı başarıyla iptal edildi.`,
            { parse_mode: 'Markdown' }
        );
    } else {
        bot.sendMessage(chatId,
            `❌ \`${keyToDelete}\` anahtarı bulunamadı.`,
            { parse_mode: 'Markdown' }
        );
    }
});

// Key kontrol (webhook için)
bot.onText(/\/kontrol (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const key = match[1].trim().toUpperCase();
    const keys = loadKeys();
    
    if (keys[key]) {
        const data = keys[key];
        const isValid = new Date() < new Date(data.expiry);
        bot.sendMessage(chatId,
            `🔍 *Anahtar Bilgileri:*\n\n` +
            `🔑 Anahtar: \`${key}\`\n` +
            `📅 Oluşturma: ${new Date(data.created).toLocaleString('tr-TR')}\n` +
            `📅 Son Kullanma: ${new Date(data.expiry).toLocaleString('tr-TR')}\n` +
            `📊 Durum: ${isValid ? '✅ Aktif' : '❌ Süresi doldu'}`,
            { parse_mode: 'Markdown' }
        );
    } else {
        bot.sendMessage(chatId, `❌ \`${key}\` geçersiz anahtar.`, { parse_mode: 'Markdown' });
    }
});

console.log('🤖 TREXA SPY Bot çalışıyor...');
console.log('📌 Yetkili ID:', ALLOWED_ID);
console.log('💡 Komutlar: /start, /keyolustur, /keylerim, /keyiptal ANAHTAR, /kontrol ANAHTAR');
