const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ---------- Multer setup for product image uploads ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = crypto.randomBytes(8).toString('hex');
    cb(null, `product-${Date.now()}-${unique}${ext}`);
  }
});

const allowedExts = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExts.includes(ext)) {
      return cb(new Error('Only image files (png, jpg, jpeg, webp, gif) are allowed.'));
    }
    cb(null, true);
  }
});

function deleteImageFile(filename) {
  if (!filename) return;
  const filePath = path.join(uploadsDir, filename);
  fs.unlink(filePath, () => {}); // ignore errors (file may not exist)
}

// ---------- PUBLIC: list active products (for billing screen) ----------
router.get('/', (req, res) => {
  const products = db.prepare('SELECT * FROM products WHERE active = 1 ORDER BY category, name').all();
  res.json(products);
});

// ---------- ADMIN: list ALL products (including inactive) ----------
router.get('/all', requireAdmin, (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY category, name').all();
  res.json(products);
});

// ---------- ADMIN: create product ----------
router.post('/', requireAdmin, upload.single('image'), (req, res) => {
  try {
    const { name, category, variant, price } = req.body;
    if (!name || !category || !variant || !price) {
      if (req.file) deleteImageFile(req.file.filename);
      return res.status(400).json({ error: 'name, category, variant and price are required.' });
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      if (req.file) deleteImageFile(req.file.filename);
      return res.status(400).json({ error: 'price must be a valid positive number.' });
    }

    const image = req.file ? req.file.filename : null;

    const stmt = db.prepare(`
      INSERT INTO products (name, category, variant, price, image, active)
      VALUES (?, ?, ?, ?, ?, 1)
    `);
    const info = stmt.run(name.trim(), category.trim(), variant.trim(), priceNum, image);

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(product);
  } catch (err) {
    if (req.file) deleteImageFile(req.file.filename);
    res.status(500).json({ error: err.message || 'Failed to create product.' });
  }
});

// ---------- ADMIN: update product ----------
router.put('/:id', requireAdmin, upload.single('image'), (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) {
      if (req.file) deleteImageFile(req.file.filename);
      return res.status(404).json({ error: 'Product not found.' });
    }

    const name = req.body.name || existing.name;
    const category = req.body.category || existing.category;
    const variant = req.body.variant || existing.variant;
    const price = req.body.price !== undefined ? parseFloat(req.body.price) : existing.price;
    const active = req.body.active !== undefined ? (req.body.active === 'true' || req.body.active === true || req.body.active === '1' ? 1 : 0) : existing.active;

    if (isNaN(price) || price < 0) {
      if (req.file) deleteImageFile(req.file.filename);
      return res.status(400).json({ error: 'price must be a valid positive number.' });
    }

    let image = existing.image;
    if (req.file) {
      deleteImageFile(existing.image); // remove old image
      image = req.file.filename;
    }

    db.prepare(`
      UPDATE products SET name = ?, category = ?, variant = ?, price = ?, image = ?, active = ?
      WHERE id = ?
    `).run(name.trim(), category.trim(), variant.trim(), price, image, active, id);

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    if (req.file) deleteImageFile(req.file.filename);
    res.status(500).json({ error: err.message || 'Failed to update product.' });
  }
});

// ---------- ADMIN: delete product ----------
router.delete('/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Product not found.' });
  }
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  deleteImageFile(existing.image);
  res.json({ success: true });
});

module.exports = router;
