const express = require('express');
const QRCode = require('qrcode');
const db = require('../db/database');

const router = express.Router();

function todayDateStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function generateBillNo() {
  // Format: BILL-YYYYMMDD-XXXX (sequence number within the day)
  const dateStr = todayDateStr().replace(/-/g, '');
  const countToday = db.prepare(
    `SELECT COUNT(*) as c FROM bills WHERE bill_date = ?`
  ).get(todayDateStr()).c;
  const seq = String(countToday + 1).padStart(4, '0');
  return `BILL-${dateStr}-${seq}`;
}

// ---------- GET /api/billing/qr?amount=100 ----------
// Generates a UPI-style QR code (as a data URL) for the given amount.
router.get('/qr', async (req, res) => {
  try {
    const amount = parseFloat(req.query.amount) || 0;
    const upiIdRow = db.prepare(`SELECT value FROM settings WHERE key = 'upi_id'`).get();
    const shopNameRow = db.prepare(`SELECT value FROM settings WHERE key = 'shop_name'`).get();
    const upiId = upiIdRow ? upiIdRow.value : (process.env.UPI_ID || 'yourshop@upi');
    const shopName = shopNameRow ? shopNameRow.value : (process.env.SHOP_NAME || 'Water Supply Shop');

    // Standard UPI deep-link format understood by most UPI apps (GPay, PhonePe, Paytm)
    const upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(shopName)}&am=${amount.toFixed(2)}&cu=INR`;

    const qrDataUrl = await QRCode.toDataURL(upiString, { width: 300, margin: 1 });
    res.json({ qrDataUrl, upiString, amount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR code.' });
  }
});

// ---------- POST /api/billing  -> create a new bill ----------
router.post('/', (req, res) => {
  try {
    const { items, paymentMode, amountGiven } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Bill must contain at least one item.' });
    }
    if (!['Cash', 'QR Code'].includes(paymentMode)) {
      return res.status(400).json({ error: 'paymentMode must be "Cash" or "QR Code".' });
    }

    let total = 0;
    const cleanItems = items.map(it => {
      const qty = parseInt(it.qty, 10);
      const price = parseFloat(it.price);
      if (!it.name || !it.variant || isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
        throw new Error('Invalid item in bill.');
      }
      const lineTotal = qty * price;
      total += lineTotal;
      return { name: it.name, variant: it.variant, qty, price, lineTotal };
    });
    total = Math.round(total * 100) / 100;

    let amountGivenNum = null;
    let balance = null;

    if (paymentMode === 'Cash') {
      amountGivenNum = parseFloat(amountGiven);
      if (isNaN(amountGivenNum) || amountGivenNum < total) {
        return res.status(400).json({
          error: `Amount given (₹${isNaN(amountGivenNum) ? 0 : amountGivenNum}) is less than the bill total (₹${total}).`
        });
      }
      balance = Math.round((amountGivenNum - total) * 100) / 100;
    }

    const billNo = generateBillNo();
    const now = new Date();
    const billDate = todayDateStr();
    const billDatetime = now.toISOString();

    const stmt = db.prepare(`
      INSERT INTO bills (bill_no, bill_date, bill_datetime, items_json, total, payment_mode, amount_given, balance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      billNo,
      billDate,
      billDatetime,
      JSON.stringify(cleanItems),
      total,
      paymentMode,
      amountGivenNum,
      balance
    );

    const shopName = db.prepare(`SELECT value FROM settings WHERE key = 'shop_name'`).get();

    res.status(201).json({
      id: info.lastInsertRowid,
      billNo,
      billDate,
      billDatetime,
      items: cleanItems,
      total,
      paymentMode,
      amountGiven: amountGivenNum,
      balance,
      shopName: shopName ? shopName.value : (process.env.SHOP_NAME || 'Water Supply Shop')
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to create bill.' });
  }
});

// ---------- GET /api/billing/:id -> fetch single bill (for reprint) ----------
router.get('/:id', (req, res) => {
  const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id);
  if (!bill) return res.status(404).json({ error: 'Bill not found.' });
  bill.items = JSON.parse(bill.items_json);
  delete bill.items_json;
  res.json(bill);
});

module.exports = router;
