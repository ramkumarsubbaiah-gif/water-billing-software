require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const multer = require('multer');

const db = require('./db/database');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const billingRoutes = require('./routes/billing');
const reportRoutes = require('./routes/reports');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Bootstrap: create default admin + default settings if none exist ----------
(function bootstrap() {
  const adminCount = db.prepare('SELECT COUNT(*) as c FROM admins').get().c;
  if (adminCount === 0) {
    const username = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
    const password = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(username, hash);
    console.log(`\n[Setup] No admin found. Created default admin -> username: "${username}", password: "${password}"`);
    console.log('[Setup] IMPORTANT: Log in and change this password from the Admin Panel as soon as possible.\n');
  }

  const shopNameExists = db.prepare(`SELECT 1 FROM settings WHERE key = 'shop_name'`).get();
  if (!shopNameExists) {
    db.prepare(`INSERT INTO settings (key, value) VALUES ('shop_name', ?)`).run(process.env.SHOP_NAME || 'Water Supply Shop');
  }
  const upiIdExists = db.prepare(`SELECT 1 FROM settings WHERE key = 'upi_id'`).get();
  if (!upiIdExists) {
    db.prepare(`INSERT INTO settings (key, value) VALUES ('upi_id', ?)`).run(process.env.UPI_ID || 'yourshop@upi');
  }
})();

// ---------- Middleware ----------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 8 * 60 * 60 * 1000 // 8 hours
  }
}));

// Static files: frontend + uploaded product images
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---------- API routes ----------
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);

// ---------- Multer / general error handler ----------
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Something went wrong.' });
  }
  next();
});

// ---------- Fallback: serve index.html for root ----------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n💧 Water Supply Billing Software running at http://localhost:${PORT}`);
  console.log(`   Billing screen: http://localhost:${PORT}/`);
  console.log(`   Admin panel:    http://localhost:${PORT}/admin.html\n`);
});
