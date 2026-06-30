import os
import json
import datetime
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes, ConversationHandler, MessageHandler, filters

TOKEN = "8892528586:AAEaME8MITeJITS2hyIgRDbzkJexZ67dnKk"
KEYS_FILE = "keys.json"

# Key format: TRX-XXXX-XXXX-XXXX-XXXX
def generate_key():
    import random
    import string
    chars = string.ascii_uppercase + string.digits
    return "TRX-" + "-".join(''.join(random.choices(chars, k=4)) for _ in range(4))

def save_key(key, expiry_date):
    data = {}
    if os.path.exists(KEYS_FILE):
        with open(KEYS_FILE, "r") as f:
            data = json.load(f)
    data[key] = {
        "created": datetime.datetime.now().isoformat(),
        "expiry": expiry_date.isoformat(),
        "active": True
    }
    with open(KEYS_FILE, "w") as f:
        json.dump(data, f, indent=2)

# Conversation states
DATE, TIME = range(2)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "🤖 *Trexa Spy Key Sistemi*\n\n"
        "Hoş geldin! 🎯\n\n"
        "🔑 `/keyolustur` - Yeni key oluştur\n"
        "📋 `/keylerim` - Aktif key'lerini gör\n"
        "❓ `/yardim` - Yardım\n\n"
        "Her key 30 gün geçerlidir.",
        parse_mode="Markdown"
    )

async def yardim(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "📌 *Komutlar:*\n\n"
        "`/keyolustur` - Yeni key oluştur (tarih ve saat ister)\n"
        "`/keylerim` - Aktif key'lerini listele\n"
        "`/yardim` - Bu mesajı göster",
        parse_mode="Markdown"
    )

async def keyolustur(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "📅 *Key Oluşturma*\n\n"
        "Lütfen key'in geçerli olacağı *tarihi* gir (YYYY-AA-GG formatında):\n\n"
        "Örnek: `2026-12-31`",
        parse_mode="Markdown"
    )
    return DATE

async def date_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    date_str = update.message.text.strip()
    try:
        date_obj = datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
        context.user_data['expiry_date'] = date_obj
        await update.message.reply_text(
            "⏰ Şimdi *saati* gir (SS:DD formatında):\n\n"
            "Örnek: `23:59`",
            parse_mode="Markdown"
        )
        return TIME
    except ValueError:
        await update.message.reply_text(
            "❌ Geçersiz tarih formatı! Lütfen `YYYY-AA-GG` formatında gir.\n"
            "Örnek: `2026-12-31`",
            parse_mode="Markdown"
        )
        return DATE

async def time_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    time_str = update.message.text.strip()
    try:
        date_obj = context.user_data['expiry_date']
        hour, minute = map(int, time_str.split(":"))
        expiry = datetime.datetime(date_obj.year, date_obj.month, date_obj.day, hour, minute)
        
        if expiry < datetime.datetime.now():
            await update.message.reply_text(
                "❌ Geçmiş bir tarih girdin! Lütfen gelecekte bir tarih gir.",
                parse_mode="Markdown"
            )
            return DATE
        
        key = generate_key()
        save_key(key, expiry)
        
        await update.message.reply_text(
            f"✅ *Key başarıyla oluşturuldu!*\n\n"
            f"🔑 `{key}`\n"
            f"📅 Son kullanma: `{expiry.strftime('%Y-%m-%d %H:%M')}`\n\n"
            "Bu key'i siteye giriş yapmak için kullanabilirsin.",
            parse_mode="Markdown"
        )
        return ConversationHandler.END
    except ValueError:
        await update.message.reply_text(
            "❌ Geçersiz saat formatı! Lütfen `SS:DD` formatında gir.\n"
            "Örnek: `23:59`",
            parse_mode="Markdown"
        )
        return TIME

async def keylerim(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not os.path.exists(KEYS_FILE):
        await update.message.reply_text("📭 Henüz hiç key oluşturulmamış.")
        return
    
    with open(KEYS_FILE, "r") as f:
        data = json.load(f)
    
    if not data:
        await update.message.reply_text("📭 Henüz hiç key oluşturulmamış.")
        return
    
    now = datetime.datetime.now()
    msg = "🔑 *Aktif Key'leriniz:*\n\n"
    for key, info in data.items():
        expiry = datetime.datetime.fromisoformat(info['expiry'])
        status = "✅ Aktif" if expiry > now else "❌ Süresi Doldu"
        msg += f"`{key}` → {status}\n📅 {expiry.strftime('%Y-%m-%d %H:%M')}\n\n"
    
    await update.message.reply_text(msg, parse_mode="Markdown")

def run_bot():
    app = Application.builder().token(TOKEN).build()
    
    conv_handler = ConversationHandler(
        entry_points=[CommandHandler("keyolustur", keyolustur)],
        states={
            DATE: [MessageHandler(filters.TEXT & ~filters.COMMAND, date_handler)],
            TIME: [MessageHandler(filters.TEXT & ~filters.COMMAND, time_handler)],
        },
        fallbacks=[],
    )
    
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("yardim", yardim))
    app.add_handler(CommandHandler("keylerim", keylerim))
    app.add_handler(conv_handler)
    
    print("🤖 Trexa Spy Bot çalışıyor...")
    app.run_polling()

if __name__ == "__main__":
    run_bot()
