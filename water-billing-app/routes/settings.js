const express = require('express');
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ---------- PUBLIC: get shop settings ----------
router.get('/', (req, res) => {
  const shopNameRow = db.prepare(`SELECT value FROM settings WHERE key = 'shop_name'`).get();
  const upiIdRow = db.prepare(`SELECT value FROM settings WHERE key = 'upi_id'`).get();
  res.json({
    shopName: shopNameRow ? shopNameRow.value : (process.env.SHOP_NAME || 'Water Supply Shop'),
    upiId: upiIdRow ? upiIdRow.value : (process.env.UPI_ID || 'yourshop@upi')
  });
});

// ---------- ADMIN: update shop settings ----------
router.put('/', requireAdmin, (req, res) => {
  const { shopName, upiId } = req.body;

  const upsert = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  if (shopName !== undefined && shopName.trim() !== '') {
    upsert.run('shop_name', shopName.trim());
  }
  if (upiId !== undefined && upiId.trim() !== '') {
    upsert.run('upi_id', upiId.trim());
  }

  const shopNameRow = db.prepare(`SELECT value FROM settings WHERE key = 'shop_name'`).get();
  const upiIdRow = db.prepare(`SELECT value FROM settings WHERE key = 'upi_id'`).get();
  res.json({
    shopName: shopNameRow ? shopNameRow.value : (process.env.SHOP_NAME || 'Water Supply Shop'),
    upiId: upiIdRow ? upiIdRow.value : (process.env.UPI_ID || 'yourshop@upi')
  });
});

module.exports = router;
