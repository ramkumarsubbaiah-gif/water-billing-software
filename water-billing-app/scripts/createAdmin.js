// Run with: node scripts/createAdmin.js <username> <password>
// If an admin with the given username already exists, its password is updated.
// Otherwise a new admin account is created.

require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../db/database');

const username = process.argv[2] || process.env.DEFAULT_ADMIN_USERNAME || 'admin';
const password = process.argv[3] || process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';

const hash = bcrypt.hashSync(password, 10);

const existing = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);

if (existing) {
  db.prepare('UPDATE admins SET password_hash = ? WHERE username = ?').run(hash, username);
  console.log(`Updated password for existing admin "${username}".`);
} else {
  db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(username, hash);
  console.log(`Created new admin "${username}".`);
}

console.log(`Username: ${username}`);
console.log(`Password: ${password}`);
