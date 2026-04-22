const express = require('express');
const fetch = require('node-fetch');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== إعدادات رفع الملفات ==========
const filesDir = path.join(__dirname, 'public', 'files');
if (!fs.existsSync(filesDir)) {
    fs.mkdirSync(filesDir, { recursive: true });
}

app.use('/files', express.static(filesDir));

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
const ADMIN_IDS = ['6479602603']; // ضع معرفك هنا (ارسل /id لـ @userinfobot)
const DEVELOPER = '@a_73a3';
const BASE_URL = process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ========== قاعدة البيانات ==========
const users = new Map();
const products = new Map();
const pendingBroadcast = new Map();
let nextProductId = 1;

// ========== الخدمات ==========
const services = [
    { id: 1, name: "📸 رشق مشاهدات انستقرام", desc: "زيادة مشاهدات المنشورات +200", points: 10, quantity: 200, endpoint: "https://leofame.com/ar/free-instagram-views" },
    { id: 2, name: "❤️ رشق لايكات انستقرام", desc: "زيادة إعجابات المنشورات", points: 8, quantity: null, endpoint: "https://leofame.com/ar/free-instagram-likes" },
    { id: 3, name: "🔖 رشق حفظ انستقرام", desc: "زيادة حفظ المنشورات +30", points: 12, quantity: 30, endpoint: "https://leofame.com/ar/free-instagram-saves" },
    { id: 4, name: "👀 رشق مشاهدات ستوري", desc: "زيادة مشاهدات القصص", points: 8, quantity: null, endpoint: "https://leofame.com/ar/free-instagram-story-views", type: "user" },
    { id: 5, name: "🎵 رشق لايكات تيك توك", desc: "زيادة إعجابات التيك توك +100", points: 10, quantity: 100, endpoint: "https://leofame.com/ar/free-tiktok-likes" },
    { id: 6, name: "📱 رشق مشاهدات تيك توك", desc: "زيادة مشاهدات التيك توك", points: 8, quantity: null, endpoint: "https://leofame.com/ar/free-tiktok-views" }
];

// ========== الصفحة الرئيسية ==========
app.get('/', (req, res) => {
    res.send(`
        <html>
        <head>
            <title>IDLEB X ULTIMATE BOT</title>
            <meta charset="UTF-8">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    background: linear-gradient(135deg, #0a0a0a, #1a1a2e);
                    color: white;
                    font-family: 'Arial', sans-serif;
                    min-height: 100vh;
                }
                .header { background: rgba(0,0,0,0.8); padding: 20px; text-align: center; border-bottom: 2px solid #ff4444; }
                .logo { font-size: 60px; animation: pulse 2s infinite; display: inline-block; }
                @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.1); } }
                .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
                .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
                .stat-card { background: rgba(255,255,255,0.1); border-radius: 20px; padding: 20px; text-align: center; backdrop-filter: blur(10px); }
                .stat-number { font-size: 36px; font-weight: bold; color: #ff4444; }
                .stat-label { font-size: 14px; color: #aaa; margin-top: 10px; }
                .admin-panel { background: rgba(255,255,255,0.05); border-radius: 20px; padding: 30px; margin-top: 20px; }
                .admin-buttons { display: flex; flex-wrap: wrap; gap: 15px; justify-content: center; margin-top: 20px; }
                .btn { background: linear-gradient(135deg, #ff4444, #cc0000); padding: 12px 25px; border-radius: 30px; text-decoration: none; color: white; display: inline-block; transition: 0.3s; }
                .btn:hover { transform: translateY(-3px); box-shadow: 0 5px 20px rgba(255,0,0,0.4); }
                .btn-green { background: linear-gradient(135deg, #00cc44, #009933); }
                .btn-blue { background: linear-gradient(135deg, #0088cc, #006699); }
                .footer { text-align: center; padding: 30px; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 40px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo">🤖</div>
                <h1>IDLEB X ULTIMATE BOT</h1>
                <p>أقوى بوت متجر </p>
            </div>
            <div class="container">
                <div class="stats-grid">
                    <div class="stat-card"><div class="stat-number" id="users">0</div><div class="stat-label">👥 المستخدمين</div></div>
                    <div class="stat-card"><div class="stat-number" id="products">0</div><div class="stat-label">📦 المنتجات</div></div>
                    <div class="stat-card"><div class="stat-number" id="points">0</div><div class="stat-label">💰 إجمالي النقاط</div></div>
                    <div class="stat-card"><div class="stat-number" id="orders">0</div><div class="stat-label">📊 الطلبات</div></div>
                </div>
                <div class="admin-panel">
                    <h2 style="text-align:center;">🔐 لوحة تحكم المدير</h2>
                    <div class="admin-buttons">
                        <a href="/admin/upload" class="btn">📤 رفع منتج جديد</a>
                        <a href="/admin/products" class="btn btn-blue">📋 قائمة المنتجات</a>
                        <a href="/admin/users" class="btn btn-green">👥 قائمة المستخدمين</a>
                        <a href="/admin/broadcast" class="btn">📢 إرسال إشعار</a>
                        <a href="/admin/stats" class="btn btn-green">📊 إحصائيات</a>
                        <a href="/admin/add-points" class="btn btn-blue">💰 شحن نقاط</a>
                    </div>
                </div>
            </div>
            <div class="footer">
                <p>© 2026 IDLEB X - جميع الحقوق محفوظة</p>
                <p>👨‍💻 المطور: @IDLEBX</p>
            </div>
            <script>
                fetch('/api/stats').then(r=>r.json()).then(d=>{
                    document.getElementById('users').innerText = d.users;
                    document.getElementById('products').innerText = d.products;
                    document.getElementById('points').innerText = d.totalPoints;
                    document.getElementById('orders').innerText = d.totalOrders;
                });
            </script>
        </body>
        </html>
    `);
});

// ========== API للإحصائيات ==========
app.get('/api/stats', (req, res) => {
    const totalPoints = Array.from(users.values()).reduce((sum, u) => sum + u.points, 0);
    const totalOrders = Array.from(users.values()).reduce((sum, u) => sum + u.orders.length, 0);
    res.json({
        users: users.size,
        products: products.size,
        totalPoints: totalPoints,
        totalOrders: totalOrders
    });
});

// ========== صفحة قائمة المنتجات ==========
app.get('/admin/products', (req, res) => {
    let html = `
        <html>
        <head><title>قائمة المنتجات</title><meta charset="UTF-8"><style>
            body { background: linear-gradient(135deg,#0a0a0a,#1a1a2e); color:white; font-family:Arial; padding:20px; }
            table { width:100%; border-collapse:collapse; background:rgba(255,255,255,0.1); border-radius:10px; }
            th, td { padding:12px; text-align:right; border-bottom:1px solid rgba(255,255,255,0.2); }
            th { background:#ff4444; }
            .delete-btn { background:#ff0000; color:white; padding:5px 10px; border-radius:5px; text-decoration:none; }
            .back-btn { background:#333; padding:10px 20px; border-radius:10px; text-decoration:none; color:white; display:inline-block; margin-top:20px; }
        </style></head>
        <body>
            <h1>📋 قائمة المنتجات</h1>
            <table>
                <tr><th>ID</th><th>الاسم</th><th>السعر</th><th>النوع</th><th>الملف</th><th>حذف</th></tr>
    `;
    
    for (const p of products.values()) {
        html += `<tr>
            <td>${p.id}</td>
            <td>${p.name}</td>
            <td>${p.price}</td>
            <td>${p.type}</td>
            <td>${p.filename || 'لا يوجد'}</td>
            <td><a href="/admin/delete/${p.id}" class="delete-btn" onclick="return confirm('تأكيد الحذف؟')">🗑️</a></td>
        </tr>`;
    }
    
    html += `</table><br><a href="/" class="back-btn">🔙 رجوع</a></body></html>`;
    res.send(html);
});

// ========== صفحة المستخدمين ==========
app.get('/admin/users', (req, res) => {
    let html = `
        <html>
        <head><title>قائمة المستخدمين</title><meta charset="UTF-8"><style>
            body { background: linear-gradient(135deg,#0a0a0a,#1a1a2e); color:white; font-family:Arial; padding:20px; }
            table { width:100%; border-collapse:collapse; background:rgba(255,255,255,0.1); border-radius:10px; }
            th, td { padding:12px; text-align:right; border-bottom:1px solid rgba(255,255,255,0.2); }
            th { background:#ff4444; }
            .back-btn { background:#333; padding:10px 20px; border-radius:10px; text-decoration:none; color:white; display:inline-block; margin-top:20px; }
        </style></head>
        <body>
            <h1>👥 قائمة المستخدمين</h1>
            <table>
                <tr><th>المعرف</th><th>اسم المستخدم</th><th>النقاط</th><th>الطلبات</th><th>تاريخ التسجيل</th></tr>
    `;
    
    for (const [id, u] of users.entries()) {
        html += `<tr>
            <td>${id}</td>
            <td>${u.username || 'لا يوجد'}</td>
            <td>${u.points}</td>
            <td>${u.orders.length}</td>
            <td>${new Date(u.joinedAt).toLocaleDateString('ar')}</td>
        </tr>`;
    }
    
    html += `</table><br><a href="/" class="back-btn">🔙 رجوع</a></body></html>`;
    res.send(html);
});

// ========== صفحة إرسال إشعار ==========
app.get('/admin/broadcast', (req, res) => {
    res.send(`
        <html>
        <head><title>إرسال إشعار</title><meta charset="UTF-8"><style>
            body { background: linear-gradient(135deg,#0a0a0a,#1a1a2e); color:white; font-family:Arial; text-align:center; padding:50px; }
            form { background:rgba(255,255,255,0.1); padding:30px; border-radius:20px; max-width:500px; margin:0 auto; }
            textarea { width:100%; padding:15px; border-radius:10px; border:none; margin:10px 0; }
            button { background:#ff4444; color:white; padding:15px 30px; border:none; border-radius:30px; cursor:pointer; }
            .back-btn { background:#333; padding:10px 20px; border-radius:10px; text-decoration:none; color:white; display:inline-block; margin-top:20px; }
        </style></head>
        <body>
            <h1>📢 إرسال إشعار للجميع</h1>
            <form action="/admin/broadcast/send" method="POST">
                <textarea name="message" rows="5" placeholder="اكتب الرسالة هنا..." required></textarea>
                <button type="submit">📢 إرسال الإشعار</button>
            </form>
            <a href="/" class="back-btn">🔙 رجوع</a>
        </body>
        </html>
    `);
});

app.post('/admin/broadcast/send', express.urlencoded({ extended: true }), async (req, res) => {
    const message = req.body.message;
    let success = 0, fail = 0;
    
    for (const [userId, user] of users.entries()) {
        try {
            await sendMessage(userId, `📢 *إشعار من الإدارة*\n\n${message}`);
            success++;
        } catch (e) {
            fail++;
        }
        await new Promise(r => setTimeout(r, 50));
    }
    
    res.send(`<h3>✅ تم الإرسال</h3><p>✅ نجح: ${success} | ❌ فشل: ${fail}</p><a href="/">رجوع</a>`);
});

// ========== صفحة شحن النقاط ==========
app.get('/admin/add-points', (req, res) => {
    res.send(`
        <html>
        <head><title>شحن نقاط</title><meta charset="UTF-8"><style>
            body { background: linear-gradient(135deg,#0a0a0a,#1a1a2e); color:white; font-family:Arial; text-align:center; padding:50px; }
            form { background:rgba(255,255,255,0.1); padding:30px; border-radius:20px; max-width:400px; margin:0 auto; }
            input { width:100%; padding:12px; margin:10px 0; border-radius:10px; border:none; }
            button { background:#ff4444; color:white; padding:15px 30px; border:none; border-radius:30px; cursor:pointer; }
            .back-btn { background:#333; padding:10px 20px; border-radius:10px; text-decoration:none; color:white; display:inline-block; margin-top:20px; }
        </style></head>
        <body>
            <h1>💰 شحن نقاط لمستخدم</h1>
            <form action="/admin/add-points/send" method="POST">
                <input type="text" name="userId" placeholder="معرف المستخدم" required>
                <input type="number" name="points" placeholder="عدد النقاط" required>
                <button type="submit">💰 شحن</button>
            </form>
            <a href="/" class="back-btn">🔙 رجوع</a>
        </body>
        </html>
    `);
});

app.post('/admin/add-points/send', express.urlencoded({ extended: true }), async (req, res) => {
    const { userId, points } = req.body;
    
    if (users.has(userId)) {
        const user = users.get(userId);
        user.points += parseInt(points);
        users.set(userId, user);
        await sendMessage(userId, `🎉 تم شحن رصيدك بـ ${points} نقطة!\n💰 رصيدك الحالي: ${user.points}`);
        res.send(`<h3>✅ تم شحن ${points} نقطة للمستخدم ${userId}</h3><a href="/">رجوع</a>`);
    } else {
        res.send(`<h3>❌ المستخدم غير موجود</h3><a href="/admin/add-points">حاول مرة أخرى</a>`);
    }
});

// ========== رفع الملفات ==========
app.get('/admin/upload', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>رفع منتج جديد</title>
            <meta charset="UTF-8">
            <style>
                body { background: linear-gradient(135deg,#0a0a0a,#1a1a2e); color:white; font-family:Arial; text-align:center; padding:50px; }
                form { background:rgba(255,255,255,0.1); padding:30px; border-radius:20px; max-width:500px; margin:0 auto; }
                input, select, textarea { width:100%; padding:12px; margin:10px 0; border-radius:10px; border:none; background:rgba(255,255,255,0.2); color:white; }
                button { background:linear-gradient(135deg,#ff4444,#cc0000); color:white; padding:15px 30px; border:none; border-radius:30px; cursor:pointer; margin-top:20px; }
                .back-btn { background:#333; padding:10px 20px; border-radius:10px; text-decoration:none; color:white; display:inline-block; margin-top:20px; }
            </style>
        </head>
        <body>
            <h1>📤 رفع منتج جديد</h1>
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
            <a href="/" class="back-btn">🔙 رجوع</a>
        </body>
        </html>
    `);
});

app.post('/admin/upload-file', upload.single('file'), async (req, res) => {
    try {
        const { productName, price, type, description } = req.body;
        const file = req.file;
        
        if (!file) {
            return res.send('<h3>❌ لم يتم رفع أي ملف</h3><a href="/admin/upload">حاول مرة أخرى</a>');
        }
        
        const newId = nextProductId++;
        products.set(newId, {
            id: newId,
            name: productName,
            price: parseInt(price),
            type: type,
            filename: file.filename,
            filepath: file.path,
            fileSize: file.size,
            description: description || '',
            createdAt: Date.now()
        });
        
        res.send(`
            <h3>✅ تم إضافة المنتج بنجاح!</h3>
            <p>📦 ${productName}</p>
            <p>💰 ${price} نقطة</p>
            <p>📁 ${file.filename}</p>
            <a href="/admin/upload">➕ إضافة آخر</a><br>
            <a href="/">🏠 الرئيسية</a>
        `);
        
    } catch (error) {
        res.send('<h3>❌ حدث خطأ</h3><a href="/admin/upload">حاول مرة أخرى</a>');
    }
});

app.get('/admin/delete/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const product = products.get(id);
    
    if (product && product.filepath && fs.existsSync(product.filepath)) {
        try {
            fs.unlinkSync(product.filepath);
        } catch(e) {}
        products.delete(id);
        res.send(`<h3>✅ تم حذف المنتج</h3><a href="/admin/products">رجوع</a>`);
    } else {
        res.send(`<h3>❌ المنتج غير موجود</h3><a href="/admin/products">رجوع</a>`);
    }
});

// ========== Webhook ==========
app.post('/webhook', async (req, res) => {
    try {
        const update = req.body;
        if (update.message) await handleMessage(update.message);
        else if (update.callback_query) await handleCallback(update.callback_query);
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

    if (!users.has(userId)) {
        users.set(userId, {
            points: 100,
            username: username,
            firstName: firstName,
            orders: [],
            joinedAt: Date.now()
        });
        await sendMessage(chatId, 
            `🎉 *مرحباً بك في IDLEB X!* 🎉\n\n✨ تم إهدائك *100 نقطة* كهدية ترحيب!\n💰 رصيدك: 100 نقطة`,
            getMainKeyboard()
        );
        return;
    }

    const user = users.get(userId);
    user.lastActivity = Date.now();
    users.set(userId, user);

    if (text === '/start') {
        await sendMessage(chatId,
            `✨ *مرحباً بعودتك يا ${firstName}!*\n\n` +
            `💰 *رصيدك:* ${user.points} نقطة\n` +
            `📦 *طلباتك:* ${user.orders.length}\n` +
            `👇 اختر من القائمة`,
            getMainKeyboard()
        );
    }
    else if (text === '🛒 المتجر' || text === '/shop') {
        await showProducts(chatId);
    }
    else if (text === '📦 طلباتي' || text === '/orders') {
        await showUserOrders(chatId, user);
    }
    else if (text === '💰 رصيدي' || text === '/points') {
        await sendMessage(chatId, `💰 *رصيدك:* ${user.points} نقطة`);
    }
    else if (text === '🎁 شحن الرصيد' || text === '/recharge') {
        await sendMessage(chatId,
            `🎁 *طرق الشحن*\n\n` +
            `• تواصل مع المدير: ${DEVELOPER}\n` +
            `• رابط إحالتك: <code>https://t.me/${BOT_TOKEN.split(':')[0]}?start=ref_${userId}</code>`
        );
    }
    else if (text === '📢 القنوات') {
        await sendMessage(chatId, `📢 @IDLEBX | @IDLEBX2`);
    }
    else if (text === '🆘 مساعدة') {
        await sendMessage(chatId, `🆘 للدعم: ${DEVELOPER}`);
    }
    else if (text === '🔙 رجوع') {
        await sendMessage(chatId, `🏠 *القائمة الرئيسية*`, getMainKeyboard());
    }
    else if (text === '/admin' && ADMIN_IDS.includes(userId)) {
        await sendMessage(chatId, `🔐 *لوحة المدير*\n\n📊 إحصائيات:\n👥 ${users.size} مستخدم\n📦 ${products.size} منتج\n\n🔗 ${BASE_URL}/admin/upload`);
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
    else if (text.includes('instagram.com') || text.includes('tiktok.com')) {
        await handleRashq(chatId, userId, text, user);
    }
    else {
        await sendMessage(chatId, `❓ أمر غير معروف\n📋 /start`, getMainKeyboard());
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
        
        let message = `🛍️ *${product.name}*\n💰 ${product.price} نقطة\n📂 ${product.type}`;
        if (product.description) message += `\n📝 ${product.description}`;
        
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
        await sendMessage(chatId, `❌ رصيدك غير كافٍ!\n💰 رصيدك: ${user.points}\n💰 سعر المنتج: ${product.price}`);
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
    
    // إرسال الملف مباشرة
    if (product.filepath && fs.existsSync(product.filepath)) {
        const sent = await sendDocument(chatId, product.filepath, product.name);
        if (sent) {
            await sendMessage(chatId,
                `✅ *تم شراء المنتج بنجاح!*\n\n` +
                `📦 ${product.name}\n` +
                `💰 تم الخصم: -${product.price}\n` +
                `💰 رصيدك المتبقي: ${user.points}\n\n` +
                `📎 *تم إرسال الملف أعلاه*`
            );
        } else {
            await sendMessage(chatId,
                `✅ *تم شراء المنتج بنجاح!*\n\n` +
                `📦 ${product.name}\n` +
                `💰 تم الخصم: -${product.price}\n` +
                `💰 رصيدك المتبقي: ${user.points}\n\n` +
                `⚠️ حدث خطأ في إرسال الملف، تواصل مع المدير: ${DEVELOPER}`
            );
        }
    } else {
        await sendMessage(chatId,
            `✅ *تم شراء المنتج بنجاح!*\n\n` +
            `📦 ${product.name}\n` +
            `💰 تم الخصم: -${product.price}\n` +
            `💰 رصيدك المتبقي: ${user.points}\n\n` +
            `⚠️ الملف غير متوفر، تواصل مع المدير: ${DEVELOPER}`
        );
    }
}

async function showUserOrders(chatId, user) {
    if (user.orders.length === 0) {
        await sendMessage(chatId, `📦 ليس لديك طلبات سابقة.`);
        return;
    }
    
    let message = `📦 *طلباتي*\n━━━━━━━━━━━\n`;
    for (const order of user.orders.slice(-10).reverse()) {
        message += `📦 ${order.productName}\n📅 ${new Date(order.date).toLocaleDateString('ar')}\n━━━━━━━━━━━\n`;
    }
    await sendMessage(chatId, message);
}

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
        await sendMessage(chatId, `❓ لم نتمكن من تحديد الخدمة.`);
        return;
    }
    
    if (user.points < selectedService.points) {
        await sendMessage(chatId, `❌ رصيدك غير كافٍ!\n💰 تحتاج ${selectedService.points} نقطة`);
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
    if (selectedService.quantity) targetUrl += `&quantity=${selectedService.quantity}`;
    
    try {
        await fetch(targetUrl, { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0' } });
        await sendMessage(chatId, `✅ *تم تنفيذ ${selectedService.name}!*\n💰 تم الخصم: -${selectedService.points}\n💰 رصيدك: ${user.points}`);
    } catch (error) {
        user.points += selectedService.points;
        users.set(userId, user);
        await sendMessage(chatId, `❌ حدث خطأ، تم استرداد نقاطك.`);
    }
}

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

async function sendMessage(chatId, text, replyKeyboard = null) {
    const payload = {
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
    };
    if (replyKeyboard) payload.reply_markup = replyKeyboard.reply_markup;
    
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
        console.error('Error sending document:', error);
        return false;
    }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 IDLEB X Bot running on port ${PORT}`);
    console.log(`📁 Files: ${filesDir}`);
    console.log(`📦 Products: ${products.size}`);
});
