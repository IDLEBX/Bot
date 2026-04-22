const express = require('express');
const fetch = require('node-fetch');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== إعدادات الملفات ==========
const filesDir = path.join(__dirname, 'public', 'files');
if (!fs.existsSync(filesDir)) fs.mkdirSync(filesDir, { recursive: true });
app.use('/files', express.static(filesDir));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, filesDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// ========== إعدادات البوت ==========
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_IDS = ['7240148750'];
const BASE_URL = process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ========== قاعدة البيانات ==========
const users = new Map();
const products = new Map();
let nextProductId = 1;

// ========== خدمات الرشق (مع أزرار) ==========
const services = [
    { id: 1, name: "📸 مشاهدات انستقرام", emoji: "📸", points: 10, quantity: 200, endpoint: "https://leofame.com/ar/free-instagram-views", type: "link" },
    { id: 2, name: "❤️ لايكات انستقرام", emoji: "❤️", points: 8, quantity: null, endpoint: "https://leofame.com/ar/free-instagram-likes", type: "link" },
    { id: 3, name: "🔖 حفظ انستقرام", emoji: "🔖", points: 12, quantity: 30, endpoint: "https://leofame.com/ar/free-instagram-saves", type: "link" },
    { id: 4, name: "👀 مشاهدات ستوري", emoji: "👀", points: 8, quantity: null, endpoint: "https://leofame.com/ar/free-instagram-story-views", type: "user" },
    { id: 5, name: "🎵 لايكات تيك توك", emoji: "🎵", points: 10, quantity: 100, endpoint: "https://leofame.com/ar/free-tiktok-likes", type: "link" },
    { id: 6, name: "📱 مشاهدات تيك توك", emoji: "📱", points: 8, quantity: null, endpoint: "https://leofame.com/ar/free-tiktok-views", type: "link" }
];

// ========== المنتجات الافتراضية ==========
function initProducts() {
    products.set(1, {
        id: 1, name: "🤖 بوت استضافة احترافي", price: 50, type: "file",
        filename: null, filepath: null, description: "بوت كامل مع لوحة تحكم"
    });
    products.set(2, {
        id: 2, name: "📁 ملف يووزات تيليجرام", price: 30, type: "file",
        filename: null, filepath: null, description: "5000 يووز حقيقي"
    });
    products.set(3, {
        id: 3, name: "🎨 شعار احترافي", price: 20, type: "image",
        filename: null, filepath: null, description: "تصميم شعار مخصص"
    });
}
initProducts();

// ========== واجهة الويب الرئيسية ==========
app.get('/', (req, res) => {
    const totalPoints = Array.from(users.values()).reduce((sum, u) => sum + u.points, 0);
    const totalOrders = Array.from(users.values()).reduce((sum, u) => sum + u.orders.length, 0);
    
    res.send(`
        <html>
        <head>
            <title>IDLEB X ULTIMATE BOT</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
                    color: white;
                    font-family: 'Cairo', 'Arial', sans-serif;
                    min-height: 100vh;
                }
                .header {
                    background: rgba(0,0,0,0.8);
                    backdrop-filter: blur(10px);
                    padding: 20px;
                    text-align: center;
                    border-bottom: 2px solid #ff4444;
                }
                .logo { font-size: 60px; animation: pulse 2s infinite; display: inline-block; }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); text-shadow: 0 0 10px #ff4444; }
                    50% { transform: scale(1.1); text-shadow: 0 0 30px #ff4444; }
                }
                .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin-bottom: 40px;
                }
                .stat-card {
                    background: rgba(255,255,255,0.1);
                    backdrop-filter: blur(10px);
                    border-radius: 20px;
                    padding: 25px;
                    text-align: center;
                    transition: transform 0.3s;
                }
                .stat-card:hover { transform: translateY(-5px); }
                .stat-number { font-size: 42px; font-weight: bold; color: #ff4444; }
                .stat-label { font-size: 14px; color: #aaa; margin-top: 10px; }
                .admin-panel {
                    background: rgba(255,255,255,0.05);
                    backdrop-filter: blur(10px);
                    border-radius: 30px;
                    padding: 30px;
                    margin-top: 20px;
                    border: 1px solid rgba(255,255,255,0.1);
                }
                .admin-title { text-align: center; font-size: 24px; margin-bottom: 20px; color: #ff4444; }
                .admin-buttons {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 15px;
                    justify-content: center;
                }
                .btn {
                    background: linear-gradient(135deg, #ff4444, #cc0000);
                    padding: 12px 25px;
                    border-radius: 30px;
                    text-decoration: none;
                    color: white;
                    font-weight: bold;
                    transition: 0.3s;
                }
                .btn:hover { transform: translateY(-3px); box-shadow: 0 5px 20px rgba(255,0,0,0.4); }
                .btn-green { background: linear-gradient(135deg, #00cc44, #009933); }
                .btn-blue { background: linear-gradient(135deg, #0088cc, #006699); }
                .services-section {
                    margin-top: 40px;
                    background: rgba(255,255,255,0.03);
                    border-radius: 30px;
                    padding: 30px;
                }
                .services-title { text-align: center; font-size: 24px; margin-bottom: 20px; }
                .services-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 15px;
                }
                .service-item {
                    background: rgba(255,255,255,0.05);
                    border-radius: 15px;
                    padding: 15px;
                    text-align: center;
                }
                .footer {
                    text-align: center;
                    padding: 30px;
                    border-top: 1px solid rgba(255,255,255,0.1);
                    margin-top: 40px;
                }
                @media (max-width: 768px) {
                    .stats-grid { grid-template-columns: repeat(2, 1fr); }
                    .admin-buttons { flex-direction: column; align-items: center; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo">🤖</div>
                <h1>IDLEB X ULTIMATE BOT</h1>
                <p>أقوى بوت متجر مع رشق تفاعل ورفع ملفات حقيقية</p>
            </div>
            <div class="container">
                <div class="stats-grid">
                    <div class="stat-card"><div class="stat-number">${users.size}</div><div class="stat-label">👥 المستخدمين</div></div>
                    <div class="stat-card"><div class="stat-number">${products.size}</div><div class="stat-label">📦 المنتجات</div></div>
                    <div class="stat-card"><div class="stat-number">${totalPoints}</div><div class="stat-label">💰 إجمالي النقاط</div></div>
                    <div class="stat-card"><div class="stat-number">${totalOrders}</div><div class="stat-label">📊 الطلبات</div></div>
                </div>
                
                <div class="services-section">
                    <div class="services-title">🎯 خدمات الرشق المتوفرة</div>
                    <div class="services-grid">
                        ${services.map(s => `<div class="service-item">${s.emoji} ${s.name}<br><small>${s.points} نقطة | +${s.quantity || 'غير محدود'}</small></div>`).join('')}
                    </div>
                </div>
                
                <div class="admin-panel">
                    <div class="admin-title">🔐 لوحة تحكم المدير</div>
                    <div class="admin-buttons">
                        <a href="/admin/upload" class="btn">📤 رفع منتج</a>
                        <a href="/admin/products" class="btn btn-blue">📋 المنتجات</a>
                        <a href="/admin/users" class="btn btn-green">👥 المستخدمين</a>
                        <a href="/admin/broadcast" class="btn">📢 إشعار</a>
                        <a href="/admin/add-points" class="btn btn-green">💰 شحن نقاط</a>
                        <a href="/admin/stats" class="btn btn-blue">📊 إحصائيات</a>
                    </div>
                </div>
            </div>
            <div class="footer">
                <p>© 2026 IDLEB X - جميع الحقوق محفوظة</p>
                <p>👨‍💻 المطور: @IDLEBX | 📢 @IDLEBX2</p>
            </div>
        </body>
        </html>
    `);
});

// ========== لوحة تحكم المدير ==========
app.get('/admin/upload', (req, res) => {
    res.send(`
        <html>
        <head><title>رفع منتج</title><meta charset="UTF-8"><style>
            body { background: linear-gradient(135deg,#0a0a0a,#1a1a2e); color:white; font-family:Arial; padding:50px; text-align:center; }
            form { background:rgba(255,255,255,0.1); padding:30px; border-radius:20px; max-width:500px; margin:0 auto; }
            input,select,textarea { width:100%; padding:12px; margin:10px 0; border-radius:10px; border:none; background:rgba(255,255,255,0.2); color:white; }
            button { background:#ff4444; padding:15px 30px; border:none; border-radius:30px; color:white; cursor:pointer; }
            .back { background:#333; display:inline-block; margin-top:20px; padding:10px 20px; border-radius:10px; text-decoration:none; color:white; }
        </style></head>
        <body>
            <h1>📤 رفع منتج جديد</h1>
            <form action="/admin/upload-file" method="POST" enctype="multipart/form-data">
                <input type="text" name="productName" placeholder="اسم المنتج" required>
                <input type="number" name="price" placeholder="السعر (نقاط)" required>
                <select name="type">
                    <option value="file">📎 ملف</option>
                    <option value="apk">📱 APK</option>
                    <option value="image">🖼️ صورة</option>
                    <option value="zip">🗜️ ZIP</option>
                </select>
                <input type="file" name="file" required>
                <textarea name="description" placeholder="وصف المنتج" rows="3"></textarea>
                <button type="submit">🚀 رفع</button>
            </form>
            <a href="/" class="back">🔙 رجوع</a>
        </body>
        </html>
    `);
});

app.post('/admin/upload-file', upload.single('file'), (req, res) => {
    const { productName, price, type, description } = req.body;
    const file = req.file;
    if (!file) return res.send('<h3>❌ فشل</h3><a href="/admin/upload">حاول مرة</a>');
    
    const newId = nextProductId++;
    products.set(newId, {
        id: newId, name: productName, price: parseInt(price), type: type,
        filename: file.filename, filepath: file.path, description: description || ''
    });
    res.send(`<h3>✅ تم رفع ${productName}</h3><a href="/admin/upload">➕ إضافة آخر</a><br><a href="/">🏠 الرئيسية</a>`);
});

app.get('/admin/products', (req, res) => {
    let html = `<html><head><title>المنتجات</title><meta charset="UTF-8"><style>
        body { background:#0a0a0a; color:white; font-family:Arial; padding:20px; }
        table { width:100%; border-collapse:collapse; background:rgba(255,255,255,0.1); }
        th,td { padding:12px; text-align:right; border-bottom:1px solid #333; }
        th { background:#ff4444; }
        .delete { background:#ff0000; padding:5px 10px; border-radius:5px; text-decoration:none; color:white; }
        .back { background:#333; padding:10px 20px; border-radius:10px; text-decoration:none; color:white; display:inline-block; margin-top:20px; }
    </style></head><body>
    <h1>📋 المنتجات</h1>
    <table><tr><th>ID</th><th>الاسم</th><th>السعر</th><th>النوع</th><th>الملف</th><th>حذف</th></tr>`;
    
    for (const p of products.values()) {
        html += `<tr><td>${p.id}</td><td>${p.name}</td><td>${p.price}</td><td>${p.type}</td><td>${p.filename || '-'}</td>
        <td><a href="/admin/delete/${p.id}" class="delete" onclick="return confirm('تأكيد؟')">🗑️</a></td></tr>`;
    }
    html += `</table><br><a href="/" class="back">🔙 رجوع</a></body></html>`;
    res.send(html);
});

app.get('/admin/delete/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const p = products.get(id);
    if (p && p.filepath && fs.existsSync(p.filepath)) fs.unlinkSync(p.filepath);
    products.delete(id);
    res.send(`<h3>✅ تم الحذف</h3><a href="/admin/products">رجوع</a>`);
});

app.get('/admin/users', (req, res) => {
    let html = `<html><head><title>المستخدمين</title><meta charset="UTF-8"><style>
        body { background:#0a0a0a; color:white; font-family:Arial; padding:20px; }
        table { width:100%; border-collapse:collapse; background:rgba(255,255,255,0.1); }
        th,td { padding:12px; text-align:right; border-bottom:1px solid #333; }
        th { background:#ff4444; }
        .back { background:#333; padding:10px 20px; border-radius:10px; text-decoration:none; color:white; display:inline-block; margin-top:20px; }
    </style></head><body>
    <h1>👥 المستخدمين</h1>
    <table><tr><th>المعرف</th><th>اسم المستخدم</th><th>النقاط</th><th>الطلبات</th></tr>`;
    
    for (const [id, u] of users.entries()) {
        html += `<tr><td>${id}</td><td>${u.username || '-'}</td><td>${u.points}</td><td>${u.orders.length}</td></tr>`;
    }
    html += `</table><br><a href="/" class="back">🔙 رجوع</a></body></html>`;
    res.send(html);
});

app.get('/admin/broadcast', (req, res) => {
    res.send(`
        <html><head><title>إشعار</title><meta charset="UTF-8"><style>
            body { background:#0a0a0a; color:white; font-family:Arial; text-align:center; padding:50px; }
            form { background:rgba(255,255,255,0.1); padding:30px; border-radius:20px; max-width:500px; margin:0 auto; }
            textarea { width:100%; padding:15px; border-radius:10px; }
            button { background:#ff4444; padding:15px 30px; border:none; border-radius:30px; color:white; cursor:pointer; }
            .back { background:#333; display:inline-block; margin-top:20px; padding:10px 20px; border-radius:10px; text-decoration:none; color:white; }
        </style></head>
        <body><h1>📢 إرسال إشعار</h1>
        <form action="/admin/broadcast/send" method="POST">
            <textarea name="message" rows="5" placeholder="الرسالة..." required></textarea>
            <button type="submit">📢 إرسال</button>
        </form>
        <a href="/" class="back">🔙 رجوع</a></body></html>
    `);
});

app.post('/admin/broadcast/send', express.urlencoded({ extended: true }), async (req, res) => {
    const msg = req.body.message;
    let success = 0;
    for (const [id, u] of users.entries()) {
        await sendMessage(id, `📢 *إشعار من الإدارة*\n\n${msg}`);
        success++;
        await new Promise(r => setTimeout(r, 50));
    }
    res.send(`<h3>✅ تم الإرسال لـ ${success} مستخدم</h3><a href="/">رجوع</a>`);
});

app.get('/admin/add-points', (req, res) => {
    res.send(`
        <html><head><title>شحن نقاط</title><meta charset="UTF-8"><style>
            body { background:#0a0a0a; color:white; font-family:Arial; text-align:center; padding:50px; }
            form { background:rgba(255,255,255,0.1); padding:30px; border-radius:20px; max-width:400px; margin:0 auto; }
            input { width:100%; padding:12px; margin:10px 0; border-radius:10px; border:none; }
            button { background:#ff4444; padding:15px 30px; border:none; border-radius:30px; color:white; cursor:pointer; }
            .back { background:#333; display:inline-block; margin-top:20px; padding:10px 20px; border-radius:10px; text-decoration:none; color:white; }
        </style></head>
        <body><h1>💰 شحن نقاط</h1>
        <form action="/admin/add-points/send" method="POST">
            <input type="text" name="userId" placeholder="معرف المستخدم" required>
            <input type="number" name="points" placeholder="عدد النقاط" required>
            <button type="submit">💰 شحن</button>
        </form>
        <a href="/" class="back">🔙 رجوع</a></body></html>
    `);
});

app.post('/admin/add-points/send', express.urlencoded({ extended: true }), async (req, res) => {
    const { userId, points } = req.body;
    if (users.has(userId)) {
        const u = users.get(userId);
        u.points += parseInt(points);
        users.set(userId, u);
        await sendMessage(userId, `🎉 تم شحن رصيدك بـ ${points} نقطة!\n💰 رصيدك: ${u.points}`);
        res.send(`<h3>✅ تم شحن ${points} نقطة</h3><a href="/">رجوع</a>`);
    } else {
        res.send(`<h3>❌ المستخدم غير موجود</h3><a href="/admin/add-points">حاول مرة</a>`);
    }
});

app.get('/admin/stats', (req, res) => {
    const totalPoints = Array.from(users.values()).reduce((sum, u) => sum + u.points, 0);
    const totalOrders = Array.from(users.values()).reduce((sum, u) => sum + u.orders.length, 0);
    res.send(`
        <html><head><title>إحصائيات</title><meta charset="UTF-8"><style>
            body { background:#0a0a0a; color:white; font-family:Arial; text-align:center; padding:50px; }
            .stats { background:rgba(255,255,255,0.1); border-radius:20px; padding:30px; max-width:400px; margin:0 auto; }
            .stat { font-size:36px; color:#ff4444; }
            .back { background:#333; display:inline-block; margin-top:20px; padding:10px 20px; border-radius:10px; text-decoration:none; color:white; }
        </style></head>
        <body>
            <div class="stats">
                <h1>📊 الإحصائيات</h1>
                <p>👥 المستخدمين: <span class="stat">${users.size}</span></p>
                <p>📦 المنتجات: <span class="stat">${products.size}</span></p>
                <p>💰 إجمالي النقاط: <span class="stat">${totalPoints}</span></p>
                <p>📊 الطلبات: <span class="stat">${totalOrders}</span></p>
            </div>
            <a href="/" class="back">🔙 رجوع</a>
        </body></html>
    `);
});

// ========== Webhook ==========
app.post('/webhook', async (req, res) => {
    try {
        const update = req.body;
        if (update.message) await handleMessage(update.message);
        else if (update.callback_query) await handleCallback(update.callback_query);
        res.send('OK');
    } catch (error) {
        console.error(error);
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

    // تسجيل مستخدم جديد
    if (!users.has(userId)) {
        users.set(userId, {
            points: 100, username: username, firstName: firstName,
            orders: [], joinedAt: Date.now()
        });
        await sendMessage(chatId, 
            `🎉 *مرحباً بك في IDLEB X!* 🎉\n\n✨ تم إهدائك *100 نقطة* هدية ترحيب!\n💰 رصيدك: 100 نقطة`,
            getMainKeyboard()
        );
        return;
    }

    const user = users.get(userId);
    user.lastActivity = Date.now();
    users.set(userId, user);

    // الأوامر
    if (text === '/start') {
        await sendMessage(chatId,
            `✨ *مرحباً بعودتك يا ${firstName}!*\n\n` +
            `💰 *رصيدك:* ${user.points} نقطة\n` +
            `📦 *طلباتك:* ${user.orders.length}\n` +
            `⭐ *عضو منذ:* ${new Date(user.joinedAt).toLocaleDateString('ar')}`,
            getMainKeyboard()
        );
    }
    else if (text === '🛒 المتجر' || text === '/shop') {
        await showProducts(chatId);
    }
    else if (text === '🎯 الرشق' || text === '/rashq') {
        await showServices(chatId);
    }
    else if (text === '📦 طلباتي' || text === '/orders') {
        await showOrders(chatId, user);
    }
    else if (text === '💰 رصيدي' || text === '/points') {
        await sendMessage(chatId, `💰 *رصيدك:* ${user.points} نقطة`);
    }
    else if (text === '🎁 شحن الرصيد' || text === '/recharge') {
        await sendMessage(chatId,
            `🎁 *طرق الشحن*\n\n` +
            `• تواصل مع المدير: @IDLEBX\n` +
            `• رابط إحالتك:\n<code>https://t.me/${BOT_TOKEN.split(':')[0]}?start=ref_${userId}</code>`
        );
    }
    else if (text === '📢 القنوات') {
        await sendMessage(chatId, `📢 *قنواتنا*\n\n@IDLEBX\n@IDLEBX2`);
    }
    else if (text === '🆘 مساعدة') {
        await sendMessage(chatId, `🆘 *المساعدة*\n\nللتواصل: @IDLEBX`);
    }
    else if (text === '🔙 رجوع') {
        await sendMessage(chatId, `🏠 *القائمة الرئيسية*`, getMainKeyboard());
    }
    else if (text === '/admin' && ADMIN_IDS.includes(userId)) {
        await sendMessage(chatId, `🔐 *لوحة المدير*\n\n👥 ${users.size} مستخدم\n📦 ${products.size} منتج\n\n🔗 ${BASE_URL}/admin/upload`);
    }
    else if (text.startsWith('/addpoints') && ADMIN_IDS.includes(userId)) {
        const parts = text.split(' ');
        if (parts.length === 3 && users.has(parts[1])) {
            const target = users.get(parts[1]);
            target.points += parseInt(parts[2]);
            users.set(parts[1], target);
            await sendMessage(chatId, `✅ تم شحن ${parts[2]} نقطة`);
            await sendMessage(parts[1], `🎉 تم شحن رصيدك بـ ${parts[2]} نقطة!`);
        }
    }
    else {
        // معالجة الروابط للرشق
        if (text.includes('instagram.com') || text.includes('tiktok.com')) {
            await handleRashq(chatId, userId, text, user);
        } else {
            await sendMessage(chatId, `❓ أمر غير معروف\n📋 استخدم الأزرار`, getMainKeyboard());
        }
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
        
        let message = `🛍️ *${product.name}*\n`;
        message += `💰 السعر: ${product.price} نقطة\n`;
        message += `📂 النوع: ${product.type}\n`;
        if (product.description) message += `📝 ${product.description}`;
        
        await sendMessage(chatId, message, null, keyboard);
    }
}

// ========== عرض خدمات الرشق ==========
async function showServices(chatId) {
    const keyboard = {
        inline_keyboard: []
    };
    
    for (const service of services) {
        keyboard.inline_keyboard.push([
            { text: `${service.emoji} ${service.name} - ${service.points} نقطة`, callback_data: `service_${service.id}` }
        ]);
    }
    
    await sendMessage(chatId,
        `🎯 *خدمات الرشق المتوفرة*\n\n` +
        `اختر الخدمة المناسبة، ثم أرسل الرابط:\n\n` +
        `📸 انستقرام: ريل / بوست / ستوري\n` +
        `🎵 تيك توك: فيديو`,
        null,
        keyboard
    );
}

// ========== معالجة شراء المنتج ==========
async function handlePurchase(chatId, userId, productId) {
    const user = users.get(userId);
    const product = products.get(productId);
    
    if (!product) {
        await sendMessage(chatId, `❌ المنتج غير موجود.`);
        return;
    }
    
    if (user.points < product.price) {
        await sendMessage(chatId, `❌ *رصيدك غير كافٍ!*\n💰 رصيدك: ${user.points}\n💰 سعر المنتج: ${product.price}`);
        return;
    }
    
    // خصم النقاط
    user.points -= product.price;
    user.orders.push({
        id: Date.now(),
        productId: product.id,
        productName: product.name,
        date: Date.now()
    });
    users.set(userId, user);
    
    // إرسال الملف
    if (product.filepath && fs.existsSync(product.filepath)) {
        const sent = await sendDocument(chatId, product.filepath, product.name);
        if (sent) {
            await sendMessage(chatId,
                `✅ *تم شراء المنتج!*\n\n` +
                `📦 ${product.name}\n` +
                `💰 تم الخصم: -${product.price}\n` +
                `💰 رصيدك: ${user.points}\n\n` +
                `📎 *تم إرسال الملف أعلاه*`
            );
        } else {
            await sendMessage(chatId, `⚠️ حدث خطأ في إرسال الملف، تواصل مع المدير: @IDLEBX`);
        }
    } else {
        await sendMessage(chatId,
            `✅ *تم شراء المنتج!*\n\n` +
            `📦 ${product.name}\n` +
            `💰 تم الخصم: -${product.price}\n` +
            `💰 رصيدك: ${user.points}`
        );
    }
}

// ========== معالجة الرشق ==========
let waitingForService = new Map();

async function handleServiceSelection(chatId, userId, serviceId) {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;
    
    waitingForService.set(userId, service);
    
    let prompt = `🎯 *${service.emoji} ${service.name}*\n\n`;
    prompt += `💰 السعر: ${service.points} نقطة\n`;
    if (service.quantity) prompt += `📈 الكمية: +${service.quantity}\n\n`;
    
    if (service.type === 'user') {
        prompt += `👤 أرسل اسم المستخدم (بدون @):\nمثال: username`;
    } else {
        prompt += `🔗 أرسل رابط المنشور:\nمثال: https://www.instagram.com/p/...`;
    }
    
    await sendMessage(chatId, prompt);
}

async function handleRashq(chatId, userId, link, user) {
    const service = waitingForService.get(userId);
    if (!service) {
        await sendMessage(chatId, `🎯 *اختر الخدمة أولاً*\n\nاستخدم /rashq أو زر "🎯 الرشق"`, getMainKeyboard());
        return;
    }
    
    waitingForService.delete(userId);
    
    if (user.points < service.points) {
        await sendMessage(chatId, `❌ *رصيدك غير كافٍ!*\n💰 تحتاج ${service.points} نقطة\n💰 رصيدك: ${user.points}`);
        return;
    }
    
    // خصم النقاط
    user.points -= service.points;
    users.set(userId, user);
    
    // تحضير الرابط
    let targetUrl;
    if (service.type === 'user') {
        targetUrl = `${service.endpoint}?username=${encodeURIComponent(link)}`;
    } else {
        targetUrl = `${service.endpoint}?url=${encodeURIComponent(link)}`;
    }
    if (service.quantity) targetUrl += `&quantity=${service.quantity}`;
    
    await sendMessage(chatId, `⏳ جاري تنفيذ ${service.name}...`);
    
    try {
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        
        await sendMessage(chatId,
            `✅ *تم تنفيذ ${service.name}!*\n\n` +
            `🔗 الرابط: ${link.substring(0, 50)}${link.length > 50 ? '...' : ''}\n` +
            `💰 تم الخصم: -${service.points}\n` +
            `💰 رصيدك المتبقي: ${user.points}\n\n` +
            `⏱️ سيتم التنفيذ خلال 5-30 دقيقة\n` +
            `📢 @IDLEBX`
        );
    } catch (error) {
        user.points += service.points;
        users.set(userId, user);
        await sendMessage(chatId, `❌ حدث خطأ، تم استرداد نقاطك.\n📞 تواصل مع المدير: @IDLEBX`);
    }
}

async function showOrders(chatId, user) {
    if (user.orders.length === 0) {
        await sendMessage(chatId, `📦 ليس لديك طلبات سابقة.`);
        return;
    }
    
    let message = `📦 *طلباتي السابقة*\n━━━━━━━━━━━━━━━━━\n`;
    for (const order of user.orders.slice(-10).reverse()) {
        message += `📦 ${order.productName}\n📅 ${new Date(order.date).toLocaleDateString('ar')}\n━━━━━━━━━━━━━━━━━\n`;
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
    else if (data.startsWith('service_')) {
        const serviceId = parseInt(data.split('_')[1]);
        await handleServiceSelection(chatId, userId, serviceId);
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
                [{ text: "🛒 المتجر" }, { text: "🎯 الرشق" }],
                [{ text: "📦 طلباتي" }, { text: "💰 رصيدي" }],
                [{ text: "🎁 شحن الرصيد" }, { text: "📢 القنوات" }],
                [{ text: "🆘 مساعدة" }, { text: "🔙 رجوع" }]
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
    if (replyKeyboard) payload.reply_markup = replyKeyboard.reply_markup;
    if (inlineKeyboard) payload.reply_markup = JSON.stringify(inlineKeyboard);
    
    try {
        await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (e) {}
}

async function sendDocument(chatId, filePath, fileName) {
    try {
        const form = new FormData();
        form.append('chat_id', chatId);
        form.append('document', fs.createReadStream(filePath));
        
        const response = await fetch(`${TELEGRAM_API}/sendDocument`, {
            method: 'POST',
            body: form,
            headers: form.getHeaders()
        });
        const result = await response.json();
        return result.ok === true;
    } catch (error) {
        return false;
    }
}

// ========== تشغيل السيرفر ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 IDLEB X Bot running on port ${PORT}`);
    console.log(`📁 Files: ${filesDir}`);
    console.log(`📦 Products: ${products.size}`);
    console.log(`👥 Users: ${users.size}`);
});
