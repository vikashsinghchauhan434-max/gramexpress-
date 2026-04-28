// ============================================================
// GramExpress Backend — server.js
// MongoDB + Mongoose | Node 18+
// Deploy: Render | DB: MongoDB Atlas (Free)
// ============================================================

const express  = require('express');
const cors     = require('cors');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const mongoose = require('mongoose');

// ── Firebase Admin SDK ────────────────────────────────────────
let firebaseAdmin = null;
try {
  const admin = require('firebase-admin');
  const serviceAccount = {
    type: "service_account",
    project_id: "gramexpress-e2b24",
    private_key_id: "2eaa7a1d97459ad82c592fd7f90e860dc70305ca",
    private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCTHPmqayVORyEs\n5eUZ0qLukphgKln52KHIuxCPnLnT2j4b8yo9b0al9rdk96yBESF4MEn2q/RryTuH\nxFihqrbXcR/h6bqKOMNK6s3NT0bAVo6+GkgkO4pnK+lMDvHijrdcSvK/+CPHYHIb\nZrWn/4E5ECyzclnq6pM8ShrshfupN/8wRhXRosBYLM8wrRM6tYvuhBWu+8rGyHjw\n7eD8C+S4RrHAe7dZCjQHXjl1LQeAf04BB48yI/POHERxn9C0xzWWb1hyj3czApBb\n+kINT1G2JqG7928FFzWhkrkylsgG21xCfKfwlZyiqpA9uCjgXKFiBZ03I0T2BjL1\nLAj59hovAgMBAAECggEAFvizzZYchawatJGTZCRdd8ZhT8bdNOPMY3U+YUZ2R+vw\nvdmLE3vAOuMbAQOhpqe/o65apk90g64xAwK4Wko3cc3Czjp6e+HgMN8YUsJZyGfb\nsziUYj//3RtguxUsVRW28Qzs+efr4lKfjsLLg9ekXH43lK+69bE6W3Qw3xUO1n3g\n2lqz0sis8Ymvqgx8+kBoh89wX7BDDZOVF53ZTtzDgVXYQdNnDsbkqbU3w9wEi0w/\n7mdZ1k6RxJl42WZiG873uB1cawGgKJYq3pqMhd5S3J2loeVh63DDtoyaDCeEmaFj\nkGXbI7/5HEB5FQfe+a8/1i3AkrHC62ju6Mc8brOmfQKBgQDCfO2g0eBruXcRB2et\nuh+a5+am5CfhBWP4qRHD2FrlDT6xAaos6iFODJSBFjo/+Y6nO7Oq1oKWXiDPQJ4y\ngeN7NGGh+euMqjFMZNKVEjeUhEcwLXEBIEl4YfOueN+fs4lOtPZERTJyJsCJRZPL\nFtMFUnXyBF4AR3ZheAs2srq29QKBgQDBpEJzfGaXdQFV86IazIMCi0Mu8tZYmtb4\nM6xpEeDYSmYPcB1US10JPKuW2QGajZynp7B4QqeBJ+fPIHCjYoFgn72fpcfFtKy0\ntIosLRc+11PfsCVltJsg12WwyXYY7KsKxNZKA1cjBg/xZJyxTScouhRowepjla/r\nD+4lfsCuEwKBgHJS9WxfcshgETmVXMCmdAWe49qeq0J+5LE60RKKj4OtMXjjPaGB\nT2qNwo3O/xa0H8L2OTrnNYQmeKrblSKjb5DwzaNlQa1CLhB2A8NVHg7TYvVTAOZk\nkEuPaKraqrk51DDL9ydSdcDcPrlyiNoM5KZwPpyxLICFgXTyF8VjcpYxAoGAXzWD\nUsMEsk1eRcOPnbuWYsbUVp4hk9k1/z1w9QxMUCxseAS49vxDF0qUV4wFRNeCAdDq\nbIbhUxiq2mVp3HuPf1Gra3aYffXywLrQAR5+gnBfFenGyXX+nCwsHLtBbMnY42ea\nsTNpQZg2eIrunCKCMX0kkclelG5B28KuZhMna68CgYBU+r1kpyy0J623NRRA/pne\nPPN1Uz+Lst2Lw0LyJZ6wDlAerbx0SUAofuv8SgLEibft5oxq0/NXPif1KvImb/eA\n3vYuH9rEy3k50nDbGXBYhIZXFZHVSIOVflpZmpXyckVOlIc14VjxNeIVZHSQaqKp\nJ+G6sPDgtJtDJa63KgjUFg==\n-----END PRIVATE KEY-----\n",
    client_email: "firebase-adminsdk-fbsvc@gramexpress-e2b24.iam.gserviceaccount.com",
    client_id: "113974582077935685130",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40gramexpress-e2b24.iam.gserviceaccount.com"
  };
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  firebaseAdmin = admin;
  console.log('✅ Firebase Admin SDK initialized');
} catch(e) {
  console.warn('⚠️  Firebase Admin not available:', e.message);
}

const app     = express();
const PORT    = process.env.PORT || 3000;
const SECRET  = process.env.JWT_SECRET || 'gramexpress_secret_key_2026';
const MONGO_URI = process.env.MONGO_URI || '';

if (!MONGO_URI) {
  console.error('❌ MONGO_URI env variable not set!');
  process.exit(1);
}

// ── MongoDB Connect ───────────────────────────────────────────
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(e  => { console.error('❌ MongoDB error:', e.message); process.exit(1); });

// ── Schemas ───────────────────────────────────────────────────
const genId = (prefix) => prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);

const UserSchema = new mongoose.Schema({
  _id:          { type: String, default: () => genId('u') },
  name:         { type: String, required: true },
  email:        { type: String, required: true, unique: true, lowercase: true },
  phone:        { type: String, default: '' },
  password:     { type: String, required: true },
  role:         { type: String, default: 'customer' },
  status:       { type: String, default: 'active' },
  vendorStatus: { type: String, default: null },
  storeName:    { type: String, default: null },
  location:     { type: String, default: null },
  category:     { type: String, default: null },
  address:      { type: String, default: null },
  profilePic:   { type: String, default: null },
  isGoogle:     { type: Boolean, default: false },
  otpCount:     { type: Number, default: 0 },
  otpWindow:    { type: Number, default: 0 },
}, { timestamps: true, _id: false });

const ProductSchema = new mongoose.Schema({
  _id:         { type: String, default: () => genId('p') },
  name:        { type: String, required: true },
  vendorId:    { type: String, required: true },
  category:    String, subcategory: String,
  price:       { type: Number, required: true },
  mrp:         Number, unit: String,
  emoji:       { type: String, default: '📦' },
  brand:       String, stock: { type: Number, default: 0 },
  description: String, highlights: [String], photos: [String],
  status:      { type: String, default: 'active' },
}, { timestamps: true, _id: false });

const OrderSchema = new mongoose.Schema({
  _id:             { type: String, default: () => 'ORD' + String(Date.now()).slice(-6) + Math.random().toString(36).slice(2,5).toUpperCase() },
  customerId:      String, customerName: String,
  customerPhone:   String, customerAddress: String,
  vendorId:        String, vendorName: String,
  items:           { type: mongoose.Schema.Types.Mixed, default: [] },
  subtotal:        { type: Number, default: 0 },
  delivery:        { type: Number, default: 0 },
  discount:        { type: Number, default: 0 },
  total:           { type: Number, required: true },
  coupon:          String, deliveryType: { type: String, default: 'standard' },
  status:          { type: String, default: 'processing' },
  orderDate:       String,
}, { timestamps: true, _id: false });

const FeedbackSchema = new mongoose.Schema({
  _id:        { type: String, default: () => genId('fb') },
  userId:     String, userName: String,
  vendorId:   String, vendorName: String,
  rating:     { type: Number, required: true }, text: String,
}, { timestamps: true, _id: false });

const SettingSchema = new mongoose.Schema({
  key:   { type: String, unique: true },
  value: mongoose.Schema.Types.Mixed,
});

const User     = mongoose.model('User',     UserSchema);
const Product  = mongoose.model('Product',  ProductSchema);
const Order    = mongoose.model('Order',    OrderSchema);
const Feedback = mongoose.model('Feedback', FeedbackSchema);
const Setting  = mongoose.model('Setting',  SettingSchema);

// ── Uploads folder ────────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename:    (_req, file,  cb) => cb(null, Date.now() + '_' + file.originalname.replace(/\s+/g, '_')),
});
const upload = multer({
  storage, limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));
const PUBLIC_DIR = path.join(__dirname, 'public');
app.use(express.static(PUBLIC_DIR));
app.get('/', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

// ── Settings helpers ──────────────────────────────────────────
async function getSettingVal(key) {
  const row = await Setting.findOne({ key });
  return row ? row.value : null;
}
async function setSettingVal(key, val) {
  await Setting.findOneAndUpdate({ key }, { value: val }, { upsert: true });
}

// ── Seed (runs once) ──────────────────────────────────────────
async function seedDB() {
  const count = await User.countDocuments();
  if (count > 0) return;
  console.log('🌱 Seeding database...');

  await setSettingVal('delivery', { baseDeliveryCharge: 20, freeDeliveryAbove: 200, expressDeliveryCharge: 40 });
  await setSettingVal('coupons', [
    { code: 'GRAM20',  discount: 20, minOrder: 100 },
    { code: 'FIRST50', discount: 50, minOrder: 200 },
  ]);

  const users = [
    { _id:'u_admin', name:'GramExpress Admin',  email:'vikashchauhan@gmail.com', phone:'9999999999', password:'JEe2024%',  role:'admin' },
    { _id:'u_c1',    name:'Ramesh Kumar',        email:'ramesh@gmail.com',      phone:'9876543210', password:'pass123',   role:'customer', address:'Village Mahana, Amritsar' },
    { _id:'u_c2',    name:'Sunita Devi',         email:'sunita@gmail.com',      phone:'9812345678', password:'pass123',   role:'customer', address:'Lopoke Village, Amritsar' },
    { _id:'u_v1',    name:'Sharma Kirana Store', email:'sharma@gmail.com',      phone:'9811111111', password:'vendor123', role:'vendor', vendorStatus:'approved', storeName:'Sharma Kirana',    location:'Village Mahana, Amritsar', category:'Vegetables & Fruits' },
    { _id:'u_v2',    name:'Punjab Dairy Fresh',  email:'dairy@gmail.com',       phone:'9822222222', password:'vendor123', role:'vendor', vendorStatus:'approved', storeName:'Punjab Dairy Fresh', location:'Attari, Amritsar',        category:'Dairy Products' },
    { _id:'u_v3',    name:'Priya Greens',        email:'priya@gmail.com',       phone:'9833333333', password:'vendor123', role:'vendor', vendorStatus:'pending',  storeName:'Greens by Priya',   location:'Lopoke, Amritsar',        category:'Vegetables & Fruits' },
  ];
  for (const u of users) {
    u.password = bcrypt.hashSync(u.password, 10);
    await User.create(u);
  }

  await Product.insertMany([
    { _id:'p1',  name:'Fresh Tomatoes', vendorId:'u_v1', category:'Vegetables', subcategory:'Tomatoes & Peppers', price:40,  mrp:60,  unit:'1 kg',  emoji:'🍅', description:'Farm fresh tomatoes' },
    { _id:'p2',  name:'Spinach Bunch',  vendorId:'u_v1', category:'Vegetables', subcategory:'Leafy Greens',       price:25,  mrp:35,  unit:'500g',  emoji:'🥬', description:'Fresh green spinach' },
    { _id:'p3',  name:'Full Cream Milk',vendorId:'u_v2', category:'Dairy',      subcategory:'Milk',               price:60,  mrp:70,  unit:'1 L',   emoji:'🥛', description:'Pure full cream milk' },
    { _id:'p4',  name:'Paneer',         vendorId:'u_v2', category:'Dairy',      subcategory:'Paneer & Cheese',    price:80,  mrp:100, unit:'200g',  emoji:'🧀', description:'Fresh homemade paneer' },
    { _id:'p5',  name:'Basmati Rice',   vendorId:'u_v1', category:'Grains',     subcategory:'Rice',               price:120, mrp:150, unit:'2 kg',  emoji:'🌾', description:'Long grain basmati rice' },
    { _id:'p6',  name:'Red Apple',      vendorId:'u_v1', category:'Fruits',     subcategory:'Apples & Pears',     price:150, mrp:200, unit:'1 kg',  emoji:'🍎', description:'Fresh Kashmiri apples' },
    { _id:'p7',  name:'Mango',          vendorId:'u_v1', category:'Fruits',     subcategory:'Tropical Fruits',    price:90,  mrp:120, unit:'1 kg',  emoji:'🥭', description:'Alphonso mangoes' },
    { _id:'p8',  name:'Curd',           vendorId:'u_v2', category:'Dairy',      subcategory:'Curd & Yogurt',      price:45,  mrp:55,  unit:'500g',  emoji:'🍯', description:'Thick fresh curd' },
    { _id:'p9',  name:'Onion',          vendorId:'u_v1', category:'Vegetables', subcategory:'Onion & Garlic',     price:35,  mrp:45,  unit:'1 kg',  emoji:'🧅', description:'Fresh red onions' },
    { _id:'p10', name:'Potato',         vendorId:'u_v1', category:'Vegetables', subcategory:'Root Vegetables',    price:30,  mrp:40,  unit:'1 kg',  emoji:'🥔', description:'Fresh potatoes' },
  ]);
  console.log('✅ Database seeded!');
}

// ── Auth Helpers ──────────────────────────────────────────────
function makeToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, SECRET, { expiresIn: '30d' });
}
function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(header.replace('Bearer ', ''), SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}
function fmtUser(u) {
  return {
    id: u._id, name: u.name, email: u.email, phone: u.phone,
    role: u.role, status: u.status, vendorStatus: u.vendorStatus,
    storeName: u.storeName, location: u.location, category: u.category,
    address: u.address, profilePic: u.profilePic, isGoogleUser: !!u.isGoogle,
    createdAt: u.createdAt,
  };
}
function fmtProduct(p) {
  return {
    id: p._id, name: p.name, vendorId: p.vendorId,
    category: p.category, subcategory: p.subcategory,
    price: p.price, mrp: p.mrp, unit: p.unit,
    emoji: p.emoji, brand: p.brand, stock: p.stock,
    desc: p.description, highlights: p.highlights || [],
    photos: p.photos || [], image: (p.photos||[])[0]||'',
    status: p.status, createdAt: p.createdAt,
  };
}
function fmtOrder(o) {
  return {
    id: o._id, customerId: o.customerId,
    customerName: o.customerName, customerPhone: o.customerPhone,
    customerAddress: o.customerAddress,
    vendorId: o.vendorId, vendorName: o.vendorName,
    items: o.items || [], subtotal: o.subtotal,
    delivery: o.delivery, discount: o.discount, total: o.total,
    coupon: o.coupon, deliveryType: o.deliveryType,
    status: o.status, date: o.orderDate, createdAt: o.createdAt,
  };
}
function fmtFeedback(f) {
  return {
    id: f._id, userId: f.userId, userName: f.userName,
    vendorId: f.vendorId, vendorName: f.vendorName,
    rating: f.rating, text: f.text, date: f.createdAt,
  };
}

// ============================================================
// ROUTES — AUTH
// ============================================================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: 'Invalid email or password' });
    if (user.status === 'blocked') return res.status(403).json({ error: 'blocked', user: fmtUser(user) });
    if (user.role === 'vendor' && user.vendorStatus === 'pending')
      return res.status(403).json({ error: 'pending', user: fmtUser(user) });
    res.json({ token: makeToken(user), user: fmtUser(user) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password, role, address, storeName, location, category } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ error: 'Fill all fields' });
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password min 6 chars' });
    if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ error: 'Email already registered' });
    if (role === 'vendor' && (!storeName || !location)) return res.status(400).json({ error: 'Store name and location required' });
    const user = await User.create({
      name, email: email.toLowerCase(), phone,
      password: bcrypt.hashSync(password, 10),
      role, vendorStatus: role === 'vendor' ? 'pending' : null,
      storeName: storeName||null, location: location||null,
      category: category||null, address: address||null,
    });
    if (role === 'vendor') return res.json({ status: 'pending', user: fmtUser(user) });
    res.json({ token: makeToken(user), user: fmtUser(user) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const { name, email } = req.body;
    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = await User.create({ name, email: email.toLowerCase(), password: bcrypt.hashSync('google_'+Date.now(), 10), role: 'customer', isGoogle: true });
    }
    res.json({ token: makeToken(user), user: fmtUser(user) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) return res.status(400).json({ error: 'Email and new password required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Password min 6 characters' });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'No account found with this email address' });
    await User.updateOne({ _id: user._id }, { password: bcrypt.hashSync(newPassword, 10) });
    res.json({ token: makeToken(user), user: fmtUser(user) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});


app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: fmtUser(user) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// SNAPSHOT
// ============================================================
app.get('/api/snapshot', authMiddleware, async (req, res) => {
  try {
    const [users, products, orders, feedback, delivery, coupons] = await Promise.all([
      User.find().then(r => r.map(fmtUser)),
      Product.find({ status: 'active' }).sort({ createdAt: -1 }).then(r => r.map(fmtProduct)),
      Order.find().sort({ createdAt: -1 }).then(r => r.map(fmtOrder)),
      Feedback.find().sort({ createdAt: -1 }).then(r => r.map(fmtFeedback)),
      getSettingVal('delivery'),
      getSettingVal('coupons'),
    ]);
    res.json({ users, products, orders, feedback, settings: { ...delivery, coupons: coupons || [] }, version: 6 });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// USERS
// ============================================================
app.get('/api/users', authMiddleware, requireRole('admin'), async (req, res) => {
  try { res.json((await User.find({ role: { $ne: 'admin' } })).map(fmtUser)); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/users/me', authMiddleware, async (req, res) => {
  try {
    const { name, phone, address, location, storeName, category } = req.body;
    const update = {};
    if (name)      update.name      = name;
    if (phone)     update.phone     = phone;
    if (address)   update.address   = address;
    if (location)  update.location  = location;
    if (storeName) update.storeName = storeName;
    if (category)  update.category  = category;
    if (!Object.keys(update).length) return res.status(400).json({ error: 'Nothing to update' });
    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true });
    res.json({ user: fmtUser(user) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/users/:id/status', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'blocked'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    await User.findByIdAndUpdate(req.params.id, { status });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/users/:id/vendor-status', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { vendorStatus } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(vendorStatus)) return res.status(400).json({ error: 'Invalid vendor status' });
    if (vendorStatus === 'rejected') await User.findByIdAndDelete(req.params.id);
    else await User.findByIdAndUpdate(req.params.id, { vendorStatus });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/users/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try { await User.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// PRODUCTS
// ============================================================
app.get('/api/products', async (req, res) => {
  try {
    const { category, vendorId } = req.query;
    const filter = { status: 'active' };
    if (category) filter.category = category;
    if (vendorId) filter.vendorId = vendorId;
    res.json((await Product.find(filter).sort({ createdAt: -1 })).map(fmtProduct));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/products', authMiddleware, requireRole('vendor', 'admin'), async (req, res) => {
  try {
    const { name, price, mrp, unit, emoji, brand, stock, desc, highlights, category, subcategory, photos } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Name and price required' });
    const vendorId = req.user.role === 'admin' ? req.body.vendorId : req.user.id;
    const product  = await Product.create({
      name, vendorId, category: category||null, subcategory: subcategory||null,
      price, mrp: mrp||price, unit: unit||null, emoji: emoji||'📦',
      brand: brand||null, stock: stock||0, description: desc||null,
      highlights: Array.isArray(highlights) ? highlights : (highlights ? [highlights] : []),
      photos: photos||[],
    });
    res.status(201).json(fmtProduct(product));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/products/upload-photo', authMiddleware, requireRole('vendor', 'admin'), upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ url });
});

app.delete('/api/products/:id', authMiddleware, requireRole('vendor', 'admin'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (req.user.role !== 'admin' && product.vendorId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// ORDERS
// ============================================================
app.post('/api/orders', authMiddleware, requireRole('customer', 'admin'), async (req, res) => {
  try {
    const { items, address, deliveryType, couponCode } = req.body;
    if (!items || !items.length || !address) return res.status(400).json({ error: 'Items and address required' });
    const [customer, delivery, coupons] = await Promise.all([
      User.findById(req.user.id),
      getSettingVal('delivery'),
      getSettingVal('coupons'),
    ]);
    await User.findByIdAndUpdate(req.user.id, { address });

    const groups = {};
    for (const item of items) {
      if (!groups[item.vendorId]) groups[item.vendorId] = [];
      groups[item.vendorId].push(item);
    }

    const createdOrders = [];
    const totalSubtotal = items.reduce((s,i) => s + i.price * i.qty, 0);

    for (const vendorId of Object.keys(groups)) {
      const vItems    = groups[vendorId];
      const vendor    = await User.findById(vendorId);
      const vSubtotal = vItems.reduce((s,i) => s + i.price * i.qty, 0);
      const isFirst   = createdOrders.length === 0;

      let vDelivery = 0;
      if (isFirst) {
        vDelivery = totalSubtotal >= delivery.freeDeliveryAbove ? 0 : delivery.baseDeliveryCharge;
        if (deliveryType === 'express') vDelivery += delivery.expressDeliveryCharge;
      }
      let vDiscount = 0;
      if (isFirst && couponCode) {
        const coupon = (coupons||[]).find(c => c.code === couponCode.toUpperCase());
        if (coupon && totalSubtotal >= coupon.minOrder) {
          vDiscount = Math.floor(totalSubtotal * coupon.discount / 100);
        }
      }

      const order = await Order.create({
        customerId: req.user.id, customerName: customer.name,
        customerPhone: customer.phone, customerAddress: address,
        vendorId, vendorName: vendor?.storeName || vendor?.name || 'Vendor',
        items: vItems, subtotal: vSubtotal,
        delivery: vDelivery, discount: vDiscount,
        total: vSubtotal + vDelivery - vDiscount,
        coupon: couponCode||null, deliveryType: deliveryType||'standard',
        orderDate: new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }),
      });
      createdOrders.push(fmtOrder(order));
    }
    res.status(201).json({ orders: createdOrders });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'vendor')   filter = { vendorId: req.user.id };
    if (req.user.role === 'customer') filter = { customerId: req.user.id };
    res.json((await Order.find(filter).sort({ createdAt: -1 })).map(fmtOrder));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/orders/:id/status', authMiddleware, requireRole('vendor', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['processing','out_for_delivery','delivered','cancelled'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    await Order.findByIdAndUpdate(req.params.id, { status });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// FEEDBACK
// ============================================================
app.get('/api/feedback', async (req, res) => {
  try { res.json((await Feedback.find().sort({ createdAt: -1 })).map(fmtFeedback)); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/feedback', authMiddleware, requireRole('customer'), async (req, res) => {
  try {
    const { vendorId, vendorName, rating, text } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating 1-5 required' });
    const user = await User.findById(req.user.id);
    const fb   = await Feedback.create({ userId: req.user.id, userName: user.name, vendorId: vendorId||null, vendorName: vendorName||'General', rating, text: text||'' });
    res.status(201).json(fmtFeedback(fb));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/feedback/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try { await Feedback.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// SETTINGS
// ============================================================
app.get('/api/settings', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const [delivery, coupons] = await Promise.all([getSettingVal('delivery'), getSettingVal('coupons')]);
    res.json({ ...delivery, coupons: coupons||[] });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/settings', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { baseDeliveryCharge, freeDeliveryAbove, expressDeliveryCharge } = req.body;
    await setSettingVal('delivery', { baseDeliveryCharge, freeDeliveryAbove, expressDeliveryCharge });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/settings/coupons', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { code, discount, minOrder } = req.body;
    if (!code || !discount) return res.status(400).json({ error: 'Code and discount required' });
    const coupons = await getSettingVal('coupons') || [];
    if (coupons.find(c => c.code === code.toUpperCase())) return res.status(409).json({ error: 'Coupon already exists' });
    coupons.push({ code: code.toUpperCase(), discount, minOrder: minOrder||0 });
    await setSettingVal('coupons', coupons);
    res.json({ coupons });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/settings/coupons/:code', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    let coupons = await getSettingVal('coupons') || [];
    coupons = coupons.filter(c => c.code !== req.params.code.toUpperCase());
    await setSettingVal('coupons', coupons);
    res.json({ coupons });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Health ────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '2.0.0', platform: 'GramExpress', db: 'MongoDB' });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`\n🌿 GramExpress running on http://localhost:${PORT}`);
  await seedDB();
  console.log(`\n👤 Test Accounts:`);
  console.log(`   Admin    → vikashsinghchauhan434@gmail.com / JEe2024%`);
  console.log(`   Customer → ramesh@gmail.com      / pass123`);
  console.log(`   Vendor   → sharma@gmail.com      / vendor123\n`);
});
