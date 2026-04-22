const express = require('express');
const fetch = require('node-fetch');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== إعدادات رفع الملفات ==========
const filesDir = path.join(__dirname, 'public', 'files');
if (!fs.existsSync(filesDir)) {
    fs.mkdirSync(filesDir, { recursive: true });
}

// خدمة الملفات الثابتة
app.use('/files', express.static(filesDir));

// إعداد تخزين الملفات
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, filesDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});
const upload = multer({ storage: storage });

// ========== إعدادات البوت ==========
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_IDS = ['7240148750']; // ضع معرفك هنا
const DEVELOPER = '@IDLEBX';
const BASE_URL = process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ========== قاعدة البيانات ==========
const users = new Map();
const products = new Map();
let nextProductId = 1;

// ========== الخدمات ==========
const services = [
    { id: 1, name: "📸 رشق مشاهدات انستقرام", desc: "زيادة مشاهدات المنشورات", points: 10, quantity: 200, endpoint: "https://leofame.com/ar/free-instagram-views" },
    { id: 2, name: "❤️ رشق لايكات انستقرام", desc: "زيادة إعجابات المنشورات", points: 8, quantity: null, endpoint: "https://leofame.com/ar/free-instagram-likes" },
    { id: 3, name: "🔖 رشق حفظ انستقرام", desc: "زيادة حفظ المنشورات", points: 12, quantity: 30, endpoint: "https://leofame.com/ar/free-instagram-saves" },
    { id: 4, name: "👀 رشق مشاهدات ستوري", desc: "زيادة مشاهدات القصص", points: 8, quantity: null, endpoint: "https://leofame.com/ar/free-instagram-story-views", type: "user" },
    { id: 5, name: "🎵 رشق لايكات تيك توك", desc: "زيادة إعجابات التيك توك", points: 10, quantity: 100, endpoint: "https://leofame.com/ar/free-tiktok-likes" },
    { id: 6, name: "📱 رشق مشاهدات تيك توك", desc: "زيادة مشاهدات التيك توك", points: 8, quantity: null, endpoint: "https://leofame.com/ar/free-tiktok-views" }
];

// ========== الصفحة الرئيسية ==========
app.get('/', (req, res) => {
    res.send(`
        <html>
        <head>
            <title>IDLEB X Store Bot</title>
            <meta charset="UTF-8">
            <style>
                body {
                    background: linear-gradient(135deg, #0a0a0a, #1a1a2e);
                    color: white;
                    font-family: Arial, sans-serif;
                    text-align: center;
                    padding: 50px;
                }
                .container { max-width: 600px; margin: 0 auto; }
                .logo { font-size: 80px; animation: pulse 2s infinite; }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
                .button {
                    background: linear-gradient(135deg, #ff4444, #cc0000);
                    padding: 15px 30px;
                    border-radius: 30px;
                    text-decoration: none;
                    color: white;
                    display: inline-block;
                    margin: 10px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="logo">🤖</div>
                <h1>IDLEB X Store Bot</h1>
                <p>✅ البوت شغال بكفاءة عالية</p>
                <p>📊 متجر + رشق تفاعل + نظام نقاط</p>
                <p>📁 رفع ملفات حقيقية</p>
                <a href="/admin/upload" class="button">📤 رفع منتج جديد</a>
                <p style="margin-top: 50px;">👨‍💻 المطور: @IDLEBX</p>
            </div>
        </body>
        </html>
    `);
});

// ========== واجهة رفع الملفات للمدير ==========
app.get('/admin/upload', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>رفع ملف للمنتج</title>
            <meta charset="UTF-8">
            <style>
                body {
                    background: linear-gradient(135deg, #0a0a0a, #1a1a2e);
                    color: white;
                    font-family: Arial, sans-serif;
                    text-align: center;
                    padding: 50px;
                }
                form {
                    background: rgba(255,255,255,0.1);
                    padding: 30px;
                    border-radius: 20px;
                    max-width: 500px;
                    margin: 0 auto;
                }
                input, select, textarea {
                    width: 100%;
                    padding: 12px;
                    margin: 10px 0;
                    border-radius: 10px;
                    border: none;
                    background: rgba(255,255,255,0.2);
                    color: white;
                }
                input[type="file"] {
                    background: rgba(255,255,255,0.1);
                    padding: 10px;
                }
                button {
                    background: linear-gradient(135deg, #ff4444, #cc0000);
                    color: white;
                    padding: 15px 30px;
                    border: none;
                    border-radius: 30px;
                    cursor: pointer;
                    font-size: 16px;
                    margin-top: 20px;
                }
                .back {
                    background: #333;
                    display: inline-block;
                    margin-top: 20px;
                }
            </style>
        </head>
        <body>
            <h1>📤 رفع ملف للمنتج</h1>
            <form action="/admin/upload-file" method="POST" enctype="multipart/form-data">
                <input type="text" name="productName" placeholder="اسم المنتج" required>
                <input type="number" name="price" placeholder="السعر (نقاط)" required>
                <select name="type" required>
                    <option value="file">📎 ملف عادي</option>
                    <option value="apk">📱 تطبيق APK</option>
                    <option value="image">🖼️ صورة</option>
                    <option value="zip">🗜️ ملف مضغوط ZIP</option>
                </select>
                <input type="file" name="file" required>
                <textarea name="description" placeholder="وصف المنتج" rows="3"></textarea>
                <button type="submit">🚀 رفع المنتج</button>
            </form>
            <a href="/" class="button back">🔙 رجوع</a>
        </body>
        </html>
    `);
});

// ========== معالجة رفع الملف ==========
app.post('/admin/upload-file', upload.single('file'), async (req, res) => {
    try {
        const { productName, price, type, description } = req.body;
        const file = req.file;
        
        if (!file) {
            return res.send('<h3>❌ لم يتم رفع أي ملف</h3><a href="/admin/upload">حاول مرة أخرى</a>');
        }
        
        const newId = nextProductId++;
        const fileUrl = `${BASE_URL}/files/${file.filename}`;
        
        products.set(newId, {
            id: newId,
            name: productName,
            price: parseInt(price),
            type: type,
            filename: file.filename,
            filepath: file.path,
            fileUrl: fileUrl,
            description: description || '',
            createdAt: Date.now()
        });
        
        res.send(`
            <h3>✅ تم إضافة المنتج بنجاح!</h3>
            <p>📦 اسم المنتج: ${productName}</p>
            <p>💰 السعر: ${price} نقطة</p>
            <p>📂 النوع: ${type}</p>
            <p>📁 الملف: ${file.filename}</p>
            <a href="/admin/upload">➕ إضافة منتج آخر</a><br>
            <a href="/">🏠 العودة للرئيسية</a>
        `);
        
    } catch (error) {
        console.error(error);
        res.send('<h3>❌ حدث خطأ</h3><a href="/admin/upload">حاول مرة أخرى</a>');
    }
});

// ========== حذف ملف ==========
app.get('/admin/delete/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const product = products.get(id);
    
    if (product && product.filepath) {
        try {
            fs.unlinkSync(product.filepath);
            products.delete(id);
            res.send(`<h3>✅ تم حذف المنتج والملف بنجاح</h3><a href="/admin/upload">رجوع</a>`);
        } catch (err) {
            res.send(`<h3>❌ خطأ في الحذف</h3><a href="/admin/upload">رجوع</a>`);
        }
    } else {
        res.send(`<h3>❌ المنتج غير موجود</h3><a href="/admin/upload">رجوع</a>`);
    }
});

// ========== Webhook ==========
app.post('/webhook', async (req, res) => {
    try {
        const update = req.body;
        
        if (update.message) {
            await handleMessage(update.message);
        }
        else if (update.callback_query) {
            await handleCallback(update.callback_query);
        }
        
        res.send('OK');
    } catch (error) {
        console.error('Error:', error);
        res.send('OK');
    }
});

// ========== معالجة الرسائل ==========
async function handleMessage(message) {
    const chatId = message.chat.id;
    const text = message.text || '';
    const userId = message.from.id.toString();
    const username = message.from.username || 'مستخدم';
    const firstName = message.from.first_name || 'صديق';

    // تسجيل المستخدم الجديد
    if (!users.has(userId)) {
        users.set(userId, {
            points: 100,
            username: username,
            firstName: firstName,
            orders: [],
            joinedAt: Date.now()
        });
        
        await sendMessage(chatId, 
            `🎉 *مرحباً بك في IDLEB X!* 🎉\n\n` +
            `✨ تم إهدائك *100 نقطة* كهدية ترحيب!\n` +
            `💰 رصيدك الحالي: 100 نقطة\n\n` +
            `📌 استخدم الأزرار أدناه لبدء التجربة.`,
            getMainKeyboard()
        );
        return;
    }

    const user = users.get(userId);
    user.lastActivity = Date.now();
    users.set(userId, user);

    // معالجة الأوامر
    if (text === '/start') {
        await sendMessage(chatId,
            `✨ *مرحباً بعودتك يا ${firstName}!* ✨\n\n` +
            `💰 *رصيدك:* ${user.points} نقطة\n` +
            `📦 *طلباتك:* ${user.orders.length}\n` +
            `⭐ *عضو منذ:* ${new Date(user.joinedAt).toLocaleDateString('ar')}\n\n` +
            `👇 اختر من القائمة أدناه`,
            getMainKeyboard()
        );
    }
    else if (text === '🛒 المتجر' || text === '/shop') {
        await showProducts(chatId);
    }
    else if (text === '📦 طلباتي' || text === '/orders') {
        await showUserOrders(chatId, userId, user);
    }
    else if (text === '💰 رصيدي' || text === '/points') {
        await sendMessage(chatId,
            `💰 *رصيدك الحالي:* ${user.points} نقطة\n\n` +
            `💡 *كيف تكسب نقاط؟*\n` +
            `• استخدام خدمات الرشق (-${services[0].points} نقطة)\n` +
            `• شراء منتجات من المتجر\n` +
            `• إحالة الأصدقاء (قريباً)`
        );
    }
    else if (text === '🎁 شحن الرصيد' || text === '/recharge') {
        await sendMessage(chatId,
            `🎁 *طرق شحن الرصيد*\n\n` +
            `1️⃣ *الإحالات*\n` +
            `   كل صديق يدخل عن طريقك تربح 50 نقطة\n` +
            `   رابطك: <code>https://t.me/${BOT_TOKEN.split(':')[0]}?start=ref_${userId}</code>\n\n` +
            `2️⃣ *تواصل مع المدير*\n` +
            `   للشحن المباشر: ${DEVELOPER}`
        );
    }
    else if (text === '📢 القنوات' || text === '/channels') {
        await sendMessage(chatId,
            `📢 *قنوات IDLEB X*\n\n` +
            `✅ *قناة الخدمات:* @IDLEBX\n` +
            `✅ *قناة العروض:* @IDLEBX2\n\n` +
            `💡 اشترك ليصلك كل جديد!`
        );
    }
    else if (text === '🆘 مساعدة' || text === '/help') {
        await sendMessage(chatId,
            `🆘 *مركز المساعدة*\n\n` +
            `📌 *الأوامر المتاحة:*\n` +
            `🛒 /shop - المتجر\n` +
            `📦 /orders - طلباتي\n` +
            `💰 /points - رصيدي\n` +
            `🎁 /recharge - شحن الرصيد\n\n` +
            `👨‍💻 *الدعم الفني:* ${DEVELOPER}`
        );
    }
    else if (text === '🔙 رجوع' || text === '🏠 الرئيسية') {
        await sendMessage(chatId, `🏠 *القائمة الرئيسية*`, getMainKeyboard());
    }
    else if (text === '/admin' && ADMIN_IDS.includes(userId)) {
        await sendMessage(chatId,
            `🔐 *لوحة تحكم المدير*\n\n` +
            `📊 *إحصائيات:*\n` +
            `👥 المستخدمين: ${users.size}\n` +
            `📦 المنتجات: ${products.size}\n\n` +
            `🔗 *روابط الإدارة:*\n` +
            `📤 رفع منتج: ${BASE_URL}/admin/upload\n` +
            `🗑️ حذف منتج: ${BASE_URL}/admin/delete/رقم_المنتج`
        );
    }
    else if (text.startsWith('/addpoints') && ADMIN_IDS.includes(userId)) {
        const parts = text.split(' ');
        if (parts.length === 3) {
            const targetId = parts[1];
            const points = parseInt(parts[2]);
            if (users.has(targetId)) {
                const targetUser = users.get(targetId);
                targetUser.points += points;
                users.set(targetId, targetUser);
                await sendMessage(chatId, `✅ تم إضافة ${points} نقطة للمستخدم ${targetId}`);
                await sendMessage(targetId, `🎉 تم شحن رصيدك بـ ${points} نقطة!\n💰 رصيدك الحالي: ${targetUser.points}`);
            }
        }
    }
    else if (text.includes('instagram.com') || text.includes('tiktok.com') || text.includes('http')) {
        await handleRashq(chatId, userId, text, user);
    }
    else {
        await sendMessage(chatId,
            `❓ *عذراً، الأمر غير معروف*\n\n📋 أرسل /start لعرض القائمة`,
            getMainKeyboard()
        );
    }
}

// ========== معالجة الرشق ==========
async function handleRashq(chatId, userId, link, user) {
    let selectedService = null;
    for (const service of services) {
        if ((link.includes('instagram') && service.name.includes('انستقرام')) ||
            (link.includes('tiktok') && service.name.includes('تيك توك'))) {
            selectedService = service;
            break;
        }
    }
    
    if (!selectedService) {
        await sendMessage(chatId, `❓ لم نتمكن من تحديد الخدمة.\n📋 استخدم الأزرار لاختيار الخدمة أولاً.`);
        return;
    }
    
    if (user.points < selectedService.points) {
        await sendMessage(chatId,
            `❌ *رصيدك غير كافٍ!*\n\n` +
            `💰 رصيدك: ${user.points} نقطة\n` +
            `💰 سعر الخدمة: ${selectedService.points} نقطة\n\n` +
            `💡 الفرق: ${selectedService.points - user.points} نقطة`
        );
        return;
    }
    
    user.points -= selectedService.points;
    users.set(userId, user);
    
    let targetUrl;
    if (selectedService.type === 'user') {
        targetUrl = `${selectedService.endpoint}?username=${encodeURIComponent(link)}`;
    } else {
        targetUrl = `${selectedService.endpoint}?url=${encodeURIComponent(link)}`;
    }
    if (selectedService.quantity) {
        targetUrl += `&quantity=${selectedService.quantity}`;
    }
    
    try {
        await fetch(targetUrl, { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0' } });
        
        await sendMessage(chatId,
            `✅ *تم تنفيذ الخدمة بنجاح!*\n\n` +
            `${selectedService.name}\n` +
            `💰 تم الخصم: -${selectedService.points} نقطة\n` +
            `💰 رصيدك المتبقي: ${user.points} نقطة\n\n` +
            `⏱️ سيتم التنفيذ خلال 5-30 دقيقة`
        );
    } catch (error) {
        user.points += selectedService.points;
        users.set(userId, user);
        await sendMessage(chatId, `❌ حدث خطأ، تم استرداد نقاطك.`);
    }
}

// ========== عرض المنتجات ==========
async function showProducts(chatId) {
    const productsList = Array.from(products.values());
    
    if (productsList.length === 0) {
        await sendMessage(chatId, `📦 لا توجد منتجات حالياً.`);
        return;
    }
    
    for (const product of productsList) {
        const keyboard = {
            inline_keyboard: [[
                { text: `🛒 شراء - ${product.price} نقطة`, callback_data: `buy_${product.id}` }
            ]]
        };
        
        let message = `🛍️ *${product.name}*\n\n`;
        message += `💰 *السعر:* ${product.price} نقطة\n`;
        message += `📂 *النوع:* ${product.type}\n`;
        if (product.description) message += `📝 *الوصف:* ${product.description}\n`;
        
        await sendMessage(chatId, message, null, keyboard);
    }
}

// ========== معالجة الشراء ==========
async function handlePurchase(chatId, userId, productId) {
    const user = users.get(userId);
    const product = products.get(productId);
    
    if (!product) {
        await sendMessage(chatId, `❌ المنتج غير موجود.`);
        return;
    }
    
    if (user.points < product.price) {
        await sendMessage(chatId,
            `❌ *رصيدك غير كافٍ!*\n\n💰 رصيدك: ${user.points} نقطة\n💰 سعر المنتج: ${product.price} نقطة`
        );
        return;
    }
    
    user.points -= product.price;
    user.orders.push({
        id: Date.now(),
        productId: product.id,
        productName: product.name,
        date: Date.now()
    });
    users.set(userId, user);
    
    // إرسال الملف مباشرة (مو رابط)
    if (product.filepath && fs.existsSync(product.filepath)) {
        // إرسال الملف كـ Document
        await sendDocument(chatId, product.filepath, product.name);
        
        await sendMessage(chatId,
            `✅ *تم شراء المنتج بنجاح!*\n\n` +
            `📦 *المنتج:* ${product.name}\n` +
            `💰 *تم الخصم:* -${product.price} نقطة\n` +
            `💰 *رصيدك المتبقي:* ${user.points} نقطة\n\n` +
            `📎 *تم إرسال الملف أعلاه*`
        );
    } else {
        await sendMessage(chatId,
            `✅ *تم شراء المنتج بنجاح!*\n\n` +
            `📦 *المنتج:* ${product.name}\n` +
            `💰 *تم الخصم:* -${product.price} نقطة\n` +
            `💰 *رصيدك المتبقي:* ${user.points} نقطة\n\n` +
            `⚠️ الملف غير متوفر حالياً، تواصل مع المدير.`
        );
    }
}

async function showUserOrders(chatId, userId, user) {
    if (user.orders.length === 0) {
        await sendMessage(chatId, `📦 ليس لديك أي طلبات سابقة.`);
        return;
    }
    
    let message = `📦 *طلباتي السابقة*\n━━━━━━━━━━━━━━━━━\n\n`;
    for (const order of user.orders.slice(-10).reverse()) {
        message += `🆔 #${order.id}\n📦 ${order.productName}\n📅 ${new Date(order.date).toLocaleDateString('ar')}\n━━━━━━━━━━━━━━━━━\n`;
    }
    await sendMessage(chatId, message);
}

// ========== معالجة الأزرار ==========
async function handleCallback(callback) {
    const chatId = callback.message.chat.id;
    const userId = callback.from.id.toString();
    const data = callback.data;
    
    if (data.startsWith('buy_')) {
        const productId = parseInt(data.split('_')[1]);
        await handlePurchase(chatId, userId, productId);
    }
    
    await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callback.id })
    });
}

// ========== دوال مساعدة ==========
function getMainKeyboard() {
    return {
        reply_markup: JSON.stringify({
            keyboard: [
                [{ text: "🛒 المتجر" }, { text: "📦 طلباتي" }],
                [{ text: "💰 رصيدي" }, { text: "🎁 شحن الرصيد" }],
                [{ text: "📢 القنوات" }, { text: "🆘 مساعدة" }],
                [{ text: "🔙 رجوع" }]
            ],
            resize_keyboard: true
        })
    };
}

async function sendMessage(chatId, text, replyKeyboard = null, inlineKeyboard = null) {
    const payload = {
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
    };
    
    if (replyKeyboard?.reply_markup) {
        payload.reply_markup = replyKeyboard.reply_markup;
    } else if (replyKeyboard) {
        payload.reply_markup = JSON.stringify(replyKeyboard);
    }
    
    if (inlineKeyboard) {
        payload.reply_markup = JSON.stringify(inlineKeyboard);
    }
    
    try {
        await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

async function sendDocument(chatId, filePath, fileName) {
    const formData = new FormData();
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer]);
    formData.append('chat_id', chatId);
    formData.append('document', blob, fileName);
    
    try {
        await fetch(`${TELEGRAM_API}/sendDocument`, {
            method: 'POST',
            body: formData
        });
    } catch (error) {
        console.error('Error sending file:', error);
    }
}

// ========== تشغيل السيرفر ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 IDLEB X Bot is running on port ${PORT}`);
    console.log(`📁 Files directory: ${filesDir}`);
    console.log(`📦 Products: ${products.size}`);
});
