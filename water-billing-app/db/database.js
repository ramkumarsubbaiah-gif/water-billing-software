const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'billing.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------- SCHEMA ----------
db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,      -- 'Water' or 'Cold Drink'
    variant TEXT NOT NULL,       -- '200ml', '500ml', '1L', '2L', etc.
    price REAL NOT NULL,
    image TEXT,                  -- filename stored in /uploads
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_no TEXT UNIQUE NOT NULL,
    bill_date TEXT NOT NULL,        -- YYYY-MM-DD
    bill_datetime TEXT NOT NULL,    -- full ISO timestamp
    items_json TEXT NOT NULL,       -- JSON array of {name, variant, qty, price, lineTotal}
    total REAL NOT NULL,
    payment_mode TEXT NOT NULL,     -- 'Cash' or 'QR Code'
    amount_given REAL,              -- only for cash
    balance REAL,                   -- only for cash
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

module.exports = db;
