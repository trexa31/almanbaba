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
            const data = fs.readFileSync(KEYS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Keys dosyası okunamadı:', error.message);
    }
    return {};
}

// Key dosyasını kaydet
function saveKeys(keys) {
    try {
        fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2));
        return true;
    } catch (error) {
        console.error('Keys dosyası kaydedilemedi:', error.message);
        return false;
    }
}

// Key oluştur - formatı düzeltildi
function generateKey() {
    const prefix = 'TRX';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = prefix;
    let groupCount = 0;
    
    for (let i = 0; i < 24; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
        groupCount++;
        
        // Her 4 karakterde bir tire ekle (son gruba ekleme)
        if (groupCount === 4 && i < 23) {
            result += '-';
            groupCount = 0;
        }
    }
    
    return result;
}

// Key süresi (30 gün)
function getExpiry() {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString();
}

// Süre kontrolü - yeni fonksiyon
function isKeyValid(expiry) {
    return new Date() < new Date(expiry);
}

// Ana komutlar
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    
    bot.sendMessage(chatId, 
        `🔐 *TREXA SPY Key Sistemi*

🤖 Merhaba! Bu bot ile Trexa Spy sistemine giriş yapmak için key alabilirsin.

📌 *Komutlar:*
/keyolustur - Yeni anahtar oluştur
/keylerim - Anahtarlarını listele
/keyiptal ANAHTAR - Anahtar iptal et
/kontrol ANAHTAR - Anahtar kontrol et

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
    
    if (saveKeys(keys)) {
        bot.sendMessage(chatId,
            `✅ *Yeni Anahtar Oluşturuldu!*

🔑 *Anahtar:* \`${key}\`
📅 *Son Kullanma:* ${new Date(expiry).toLocaleString('tr-TR')}
👤 *Oluşturan:* ${userId}

⚠️ Bu anahtarı kimseyle paylaşmayın!
Siteye giriş yapmak için kullanın.`,
            { parse_mode: 'Markdown' }
        );
    } else {
        bot.sendMessage(chatId,
            '❌ Anahtar kaydedilirken bir hata oluştu!',
            { parse_mode: 'Markdown' }
        );
    }
});

// Key listele
bot.onText(/\/keylerim/, (msg) => {
    const chatId = msg.chat.id;
    const userId = String(msg.from.id);
    
    if (userId !== ALLOWED_ID) {
        bot.sendMessage(chatId, '❌ *Yetkisiz erişim!*', { parse_mode: 'Markdown' });
        return;
    }
    
    const keys = loadKeys();
    const entries = Object.entries(keys);
    
    if (entries.length === 0) {
        bot.sendMessage(chatId, '📭 Henüz oluşturulmuş anahtar yok.', { parse_mode: 'Markdown' });
        return;
    }
    
    let message = '📋 *Mevcut Anahtarlar:*\n\n';
    let activeCount = 0;
    let expiredCount = 0;
    
    entries.forEach(([key, data], i) => {
        const isValid = isKeyValid(data.expiry);
        const status = isValid ? '✅ Aktif' : '❌ Süresi doldu';
        
        if (isValid) activeCount++;
        else expiredCount++;
        
        message += `${i+1}. \`${key}\` - ${status}\n`;
        message += `   📅 ${new Date(data.expiry).toLocaleString('tr-TR')}\n`;
        message += `   👤 Oluşturan: ${data.createdBy || 'Bilinmiyor'}\n\n`;
    });
    
    message += `\n📊 *Özet:* ${activeCount} aktif, ${expiredCount} süresi dolmuş anahtar.`;
    
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// Key iptal
bot.onText(/\/keyiptal (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = String(msg.from.id);
    const keyToDelete = match[1].trim().toUpperCase();
    
    if (userId !== ALLOWED_ID) {
        bot.sendMessage(chatId, '❌ *Yetkisiz erişim!*', { parse_mode: 'Markdown' });
        return;
    }
    
    const keys = loadKeys();
    if (keys[keyToDelete]) {
        delete keys[keyToDelete];
        if (saveKeys(keys)) {
            bot.sendMessage(chatId,
                `✅ \`${keyToDelete}\` anahtarı başarıyla iptal edildi.`,
                { parse_mode: 'Markdown' }
            );
        } else {
            bot.sendMessage(chatId,
                `❌ Anahtar iptal edilirken bir hata oluştu!`,
                { parse_mode: 'Markdown' }
            );
        }
    } else {
        bot.sendMessage(chatId,
            `❌ \`${keyToDelete}\` anahtarı bulunamadı.`,
            { parse_mode: 'Markdown' }
        );
    }
});

// Key kontrol
bot.onText(/\/kontrol (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = String(msg.from.id);
    const key = match[1].trim().toUpperCase();
    
    // Yetki kontrolü - sadece yetkili kullanıcı kontrol edebilir
    if (userId !== ALLOWED_ID) {
        bot.sendMessage(chatId, '❌ *Yetkisiz erişim!*', { parse_mode: 'Markdown' });
        return;
    }
    
    const keys = loadKeys();
    
    if (keys[key]) {
        const data = keys[key];
        const isValid = isKeyValid(data.expiry);
        const timeLeft = new Date(data.expiry) - new Date();
        const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
        
        let statusMessage = isValid ? '✅ Aktif' : '❌ Süresi doldu';
        if (isValid && daysLeft > 0) {
            statusMessage += ` (${daysLeft} gün kaldı)`;
        }
        
        bot.sendMessage(chatId,
            `🔍 *Anahtar Bilgileri:*\n\n` +
            `🔑 Anahtar: \`${key}\`\n` +
            `📅 Oluşturma: ${new Date(data.created).toLocaleString('tr-TR')}\n` +
            `📅 Son Kullanma: ${new Date(data.expiry).toLocaleString('tr-TR')}\n` +
            `👤 Oluşturan: ${data.createdBy || 'Bilinmiyor'}\n` +
            `📊 Durum: ${statusMessage}`,
            { parse_mode: 'Markdown' }
        );
    } else {
        bot.sendMessage(chatId, `❌ \`${key}\` geçersiz anahtar.`, { parse_mode: 'Markdown' });
    }
});

// Hata yakalama
bot.on('error', (error) => {
    console.error('Bot hatası:', error.message);
});

// Polling hatalarını yakala
bot.on('polling_error', (error) => {
    console.error('Polling hatası:', error.message);
});

console.log('🤖 TREXA SPY Bot çalışıyor...');
console.log('📌 Yetkili ID:', ALLOWED_ID);
console.log('💡 Komutlar:');
console.log('   /start - Başlangıç mesajı');
console.log('   /keyolustur - Yeni anahtar oluştur');
console.log('   /keylerim - Anahtarları listele');
console.log('   /keyiptal ANAHTAR - Anahtar iptal et');
console.log('   /kontrol ANAHTAR - Anahtar kontrol et');
console.log('📁 Keys dosyası:', KEYS_FILE);
