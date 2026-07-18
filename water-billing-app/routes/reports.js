const express = require('express');
const db = require('../db/database');

const router = express.Router();

function todayDateStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseBillRow(row) {
  return {
    ...row,
    items: JSON.parse(row.items_json)
  };
}

function itemsSummaryString(items) {
  return items.map(i => `${i.name} (${i.variant}) x${i.qty}`).join('; ');
}

function csvEscape(value) {
  const str = String(value === null || value === undefined ? '' : value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function billsToCsv(bills) {
  const header = ['Date', 'Bill No', 'Items', 'Quantity', 'Total', 'Payment Mode'];
  const rows = bills.map(b => {
    const totalQty = b.items.reduce((sum, i) => sum + i.qty, 0);
    return [
      b.bill_date,
      b.bill_no,
      itemsSummaryString(b.items),
      totalQty,
      b.total.toFixed(2),
      b.payment_mode
    ].map(csvEscape).join(',');
  });
  return [header.join(','), ...rows].join('\n');
}

// ---------- GET /api/reports/daily?date=YYYY-MM-DD ----------
router.get('/daily', (req, res) => {
  const date = req.query.date || todayDateStr();
  const rows = db.prepare('SELECT * FROM bills WHERE bill_date = ? ORDER BY bill_datetime DESC').all(date);
  const bills = rows.map(parseBillRow);
  const totalRevenue = Math.round(bills.reduce((sum, b) => sum + b.total, 0) * 100) / 100;
  res.json({ date, count: bills.length, totalRevenue, bills });
});

// ---------- GET /api/reports/monthly?month=YYYY-MM ----------
router.get('/monthly', (req, res) => {
  const month = req.query.month || todayDateStr().slice(0, 7); // YYYY-MM
  const rows = db.prepare(`SELECT * FROM bills WHERE bill_date LIKE ? ORDER BY bill_datetime ASC`).all(`${month}%`);
  const bills = rows.map(parseBillRow);

  const byDate = {};
  for (const b of bills) {
    if (!byDate[b.bill_date]) byDate[b.bill_date] = { date: b.bill_date, count: 0, total: 0 };
    byDate[b.bill_date].count += 1;
    byDate[b.bill_date].total += b.total;
  }
  const dailyBreakdown = Object.values(byDate)
    .map(d => ({ ...d, total: Math.round(d.total * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalRevenue = Math.round(bills.reduce((sum, b) => sum + b.total, 0) * 100) / 100;

  res.json({ month, count: bills.length, totalRevenue, dailyBreakdown, bills });
});

// ---------- GET /api/reports/daily/csv?date=YYYY-MM-DD ----------
router.get('/daily/csv', (req, res) => {
  const date = req.query.date || todayDateStr();
  const rows = db.prepare('SELECT * FROM bills WHERE bill_date = ? ORDER BY bill_datetime ASC').all(date);
  const bills = rows.map(parseBillRow);
  const csv = billsToCsv(bills);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="daily-sales-${date}.csv"`);
  res.send(csv);
});

// ---------- GET /api/reports/monthly/csv?month=YYYY-MM ----------
router.get('/monthly/csv', (req, res) => {
  const month = req.query.month || todayDateStr().slice(0, 7);
  const rows = db.prepare(`SELECT * FROM bills WHERE bill_date LIKE ? ORDER BY bill_datetime ASC`).all(`${month}%`);
  const bills = rows.map(parseBillRow);
  const csv = billsToCsv(bills);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="monthly-sales-${month}.csv"`);
  res.send(csv);
});

module.exports = router;
