# 💧 Water Supply Billing Software

A simple, lightweight billing (POS) system built for a water supply / cold drinks
agency. Handles product variants (200ml, 500ml, 1L, 2L, cold drinks, etc.), cash
and QR-code payments with automatic balance calculation, an admin panel for
managing products (with images), and daily/monthly sales reports with CSV export.

Built with plain **HTML/CSS/JavaScript** on the frontend and **Node.js + Express +
SQLite** on the backend — no build step, no React, no complex frameworks.

---

## ✨ Features

- **Shop name** shown on the billing screen and printed receipts (editable in Admin).
- **Billing screen**: tap products (grouped by category) to add to the bill, adjust
  quantity, auto-calculated totals.
- **Payment options**:
  - **Cash** — enter the amount given by the customer, balance to return is
    calculated and shown automatically. Blocks billing if the amount given is
    less than the total.
  - **QR Code** — generates a UPI-style QR code for the exact bill amount; cashier
    marks the payment as received once confirmed.
- **Printable receipt** after every bill, showing shop name, itemized list, total,
  payment mode, and balance returned (for cash).
- **Admin panel** (password protected):
  - Add / edit / delete products, each with name, category, variant, price, and
    an uploaded image.
  - Edit shop name and UPI ID used for QR payments.
- **Sales reports**:
  - Daily sales list + total revenue for any selected date.
  - Monthly sales breakdown by day + total revenue + bar chart.
  - **CSV download** for both daily and monthly sales (Date, Bill No, Items,
    Quantity, Total, Payment Mode).

---

## 📁 Project Structure

```
water-billing-app/
├── server.js                # Express app entry point
├── package.json
├── .env.example              # Copy to .env and configure
├── .gitignore
├── db/
│   └── database.js           # SQLite connection + schema (auto-created)
├── middleware/
│   └── auth.js               # requireAdmin session middleware
├── routes/
│   ├── auth.js                # login / logout / session check
│   ├── products.js            # product CRUD + image upload
│   ├── billing.js             # create bill + QR code generation
│   ├── reports.js             # daily/monthly reports + CSV export
│   └── settings.js            # shop name / UPI id
├── scripts/
│   └── createAdmin.js        # CLI script to create/reset admin password
├── public/                    # Frontend (served statically)
│   ├── index.html             # Billing screen (cashier view)
│   ├── admin.html              # Admin login + panel
│   ├── reports.html            # Sales reports
│   ├── css/style.css
│   └── js/
│       ├── billing.js
│       ├── admin.js
│       └── reports.js
├── uploads/                   # Uploaded product images (gitignored contents)
└── data/                      # SQLite database file (gitignored)
```

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org) v18 or later installed.

### 2. Install dependencies
```bash
cd water-billing-app
npm install
```

### 3. Configure environment
Copy the example env file and edit values as needed:
```bash
cp .env.example .env
```

Key values in `.env`:
| Variable | Description |
|---|---|
| `PORT` | Port the app runs on (default `3000`) |
| `SESSION_SECRET` | Random secret string for session cookies — change this! |
| `DEFAULT_ADMIN_USERNAME` / `DEFAULT_ADMIN_PASSWORD` | Used **only once**, to auto-create the first admin account when the database is empty |
| `SHOP_NAME` | Default shop name (can also be changed later from Admin → Shop Settings) |
| `UPI_ID` | Your UPI ID, used to generate the payment QR code |

### 4. Run the app
```bash
npm start
```

You should see:
```
💧 Water Supply Billing Software running at http://localhost:3000
   Billing screen: http://localhost:3000/
   Admin panel:    http://localhost:3000/admin.html
```

### 5. Log in to the Admin Panel
Go to `http://localhost:3000/admin.html` and log in with the default credentials
shown in your `.env` file (default: `admin` / `admin123`).

**⚠️ Change the default password immediately** using the included script:
```bash
node scripts/createAdmin.js admin YourNewStrongPassword
```
(Restart the server after changing it.)

### 6. Add your products
From the Admin Panel, add each product variant separately, e.g.:
- Water — 200ml — ₹5
- Water — 500ml — ₹10
- Water — 1L — ₹15
- Water — 2L — ₹25
- Cold Drink — 250ml — ₹20
- Cold Drink — 500ml — ₹35

Upload a product image for each (optional but recommended).

### 7. Start billing!
Go to `http://localhost:3000/` — tap products to add them to the bill, choose
Cash or QR Code, and click **Generate Bill**.

---

## 🧾 How balance calculation works (Cash payments)

1. Cashier builds the bill (e.g. total = ₹350).
2. Cashier selects **Cash** and enters the amount the customer physically gave
   (e.g. ₹400).
3. The app immediately shows **Balance to Return: ₹50**.
4. If the amount given is less than the total, it shows how much more is needed
   and blocks bill generation until a sufficient amount is entered.

## 📱 How QR payment works

1. Cashier selects **QR Code**.
2. A QR code is generated for the exact bill total using your configured UPI ID
   (standard `upi://pay?...` deep link — works with GPay, PhonePe, Paytm, etc.).
3. Customer scans and pays.
4. Cashier ticks **"Payment received / Mark as Paid"** and clicks **Generate Bill**.

> Note: The QR code is generated locally and does not verify payment automatically
> (this app doesn't integrate with a bank/UPI provider's payment confirmation API).
> The "Mark as Paid" checkbox is a manual cashier confirmation step.

---

## 📊 Reports & CSV Export

- **Reports** page (`/reports.html`) lets you pick any date for a daily summary,
  or any month for a monthly summary with a day-by-day bar chart.
- Click **Download CSV** on either report to export the data with columns:
  `Date, Bill No, Items, Quantity, Total, Payment Mode`.

---

## 🔒 Security Notes

- Admin passwords are hashed with `bcryptjs` before being stored — plaintext
  passwords are never saved.
- Sessions are server-side (`express-session`) with an 8-hour expiry.
- Change `SESSION_SECRET` in `.env` before deploying anywhere beyond your own
  local machine.
- This project is intended for local/offline use in a single shop. If you deploy
  it to the internet, put it behind HTTPS and consider adding rate-limiting on
  the login route.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express
- **Database**: SQLite (via `better-sqlite3` — no separate DB server needed)
- **Auth**: `express-session` + `bcryptjs`
- **File uploads**: `multer`
- **QR codes**: `qrcode` npm package
- **Frontend**: Plain HTML, CSS, JavaScript (no build tools)
- **Charts**: Chart.js (loaded via CDN on the reports page)

---

## 📄 License

MIT — free to use and modify for your own business.
