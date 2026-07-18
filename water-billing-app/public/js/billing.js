// ===================== Billing Screen Logic =====================

let allProducts = [];
let currentCategory = 'All';
let cart = []; // { productId, name, variant, price, qty }
let paymentMode = 'Cash';
let shopName = 'Water Supply Shop';

const productGrid = document.getElementById('productGrid');
const categoryTabs = document.getElementById('categoryTabs');
const cartItemsEl = document.getElementById('cartItems');
const itemCountEl = document.getElementById('itemCount');
const grandTotalEl = document.getElementById('grandTotal');
const generateBillBtn = document.getElementById('generateBillBtn');
const clearCartBtn = document.getElementById('clearCartBtn');

const payCashBtn = document.getElementById('payCashBtn');
const payQrBtn = document.getElementById('payQrBtn');
const cashBox = document.getElementById('cashBox');
const qrBox = document.getElementById('qrBox');
const amountGivenInput = document.getElementById('amountGiven');
const balanceDisplay = document.getElementById('balanceDisplay');
const qrImage = document.getElementById('qrImage');
const qrAmountLabel = document.getElementById('qrAmountLabel');
const qrPaidCheckbox = document.getElementById('qrPaidCheckbox');

const receiptOverlay = document.getElementById('receiptOverlay');
const receiptContent = document.getElementById('receiptContent');
const closeReceiptBtn = document.getElementById('closeReceiptBtn');

// ---------------- Init ----------------
async function init() {
  await loadSettings();
  await loadProducts();
  bindEvents();
  updateCartUI();
}

async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    shopName = data.shopName;
    document.getElementById('shopNameHeader').textContent = shopName;
    document.title = `Billing — ${shopName}`;
  } catch (err) {
    console.error('Failed to load settings', err);
  }
}

async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    allProducts = await res.json();
    renderProductGrid();
  } catch (err) {
    productGrid.innerHTML = '<div class="empty-state">Failed to load products. Is the server running?</div>';
  }
}

function renderProductGrid() {
  const filtered = currentCategory === 'All'
    ? allProducts
    : allProducts.filter(p => p.category === currentCategory);

  if (filtered.length === 0) {
    productGrid.innerHTML = '<div class="empty-state">No products found. Ask admin to add products.</div>';
    return;
  }

  productGrid.innerHTML = filtered.map(p => `
    <div class="product-card" data-id="${p.id}">
      <div class="thumb">
        ${p.image ? `<img src="/uploads/${p.image}" alt="${escapeHtml(p.name)}">` : (p.category === 'Water' ? '💧' : '🥤')}
      </div>
      <div class="p-name">${escapeHtml(p.name)}</div>
      <div class="p-variant">${escapeHtml(p.variant)}</div>
      <div class="p-price">₹${p.price.toFixed(2)}</div>
    </div>
  `).join('');

  productGrid.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = parseInt(card.dataset.id, 10);
      const product = allProducts.find(p => p.id === id);
      if (product) addToCart(product);
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------------- Cart logic ----------------
function addToCart(product) {
  const existing = cart.find(i => i.productId === product.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      productId: product.id,
      name: product.name,
      variant: product.variant,
      price: product.price,
      qty: 1
    });
  }
  updateCartUI();
}

function changeQty(productId, delta) {
  const item = cart.find(i => i.productId === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(i => i.productId !== productId);
  }
  updateCartUI();
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.productId !== productId);
  updateCartUI();
}

function getTotal() {
  return cart.reduce((sum, i) => sum + i.qty * i.price, 0);
}

function updateCartUI() {
  if (cart.length === 0) {
    cartItemsEl.innerHTML = '<div class="empty-state">No items added yet.<br>Tap a product to add it.</div>';
  } else {
    cartItemsEl.innerHTML = cart.map(item => `
      <div class="cart-row" data-id="${item.productId}">
        <div class="ci-info">
          <div class="ci-name">${escapeHtml(item.name)}</div>
          <div class="ci-meta">${escapeHtml(item.variant)} · ₹${item.price.toFixed(2)} each</div>
        </div>
        <div class="qty-control">
          <button class="qty-minus">−</button>
          <span>${item.qty}</span>
          <button class="qty-plus">+</button>
        </div>
        <div class="ci-line-total">₹${(item.qty * item.price).toFixed(2)}</div>
        <button class="remove-btn" title="Remove">✕</button>
      </div>
    `).join('');

    cartItemsEl.querySelectorAll('.cart-row').forEach(row => {
      const id = parseInt(row.dataset.id, 10);
      row.querySelector('.qty-plus').addEventListener('click', () => changeQty(id, 1));
      row.querySelector('.qty-minus').addEventListener('click', () => changeQty(id, -1));
      row.querySelector('.remove-btn').addEventListener('click', () => removeFromCart(id));
    });
  }

  const total = getTotal();
  itemCountEl.textContent = cart.reduce((s, i) => s + i.qty, 0);
  grandTotalEl.textContent = `₹${total.toFixed(2)}`;

  updatePaymentSection(total);
  validateGenerateButton(total);
}

// ---------------- Payment mode ----------------
function setPaymentMode(mode) {
  paymentMode = mode;
  payCashBtn.classList.toggle('active', mode === 'Cash');
  payQrBtn.classList.toggle('active', mode === 'QR Code');
  cashBox.classList.toggle('hidden', mode !== 'Cash');
  qrBox.classList.toggle('hidden', mode !== 'QR Code');

  if (mode === 'QR Code') {
    loadQrCode(getTotal());
    qrPaidCheckbox.checked = false;
  }
  validateGenerateButton(getTotal());
}

async function loadQrCode(amount) {
  try {
    qrAmountLabel.textContent = `₹${amount.toFixed(2)}`;
    const res = await fetch(`/api/billing/qr?amount=${amount}`);
    const data = await res.json();
    qrImage.src = data.qrDataUrl;
  } catch (err) {
    console.error('Failed to load QR code', err);
  }
}

function updatePaymentSection(total) {
  if (paymentMode === 'QR Code') {
    qrAmountLabel.textContent = `₹${total.toFixed(2)}`;
    if (!qrBox.classList.contains('hidden')) {
      loadQrCode(total);
    }
    return;
  }

  const given = parseFloat(amountGivenInput.value);
  if (isNaN(given) || amountGivenInput.value === '') {
    balanceDisplay.classList.add('hidden');
    return;
  }
  const balance = given - total;
  balanceDisplay.classList.remove('hidden');
  if (balance < 0) {
    balanceDisplay.className = 'balance-display warn';
    balanceDisplay.innerHTML = `<span>Short by</span><span>₹${Math.abs(balance).toFixed(2)}</span>`;
  } else {
    balanceDisplay.className = 'balance-display ok';
    balanceDisplay.innerHTML = `<span>Balance to Return</span><span>₹${balance.toFixed(2)}</span>`;
  }
}

function validateGenerateButton(total) {
  if (cart.length === 0 || total <= 0) {
    generateBillBtn.disabled = true;
    return;
  }
  if (paymentMode === 'Cash') {
    const given = parseFloat(amountGivenInput.value);
    generateBillBtn.disabled = isNaN(given) || given < total;
  } else {
    generateBillBtn.disabled = !qrPaidCheckbox.checked;
  }
}

// ---------------- Generate Bill ----------------
async function generateBill() {
  const total = getTotal();
  const payload = {
    items: cart.map(i => ({ name: i.name, variant: i.variant, qty: i.qty, price: i.price })),
    paymentMode
  };
  if (paymentMode === 'Cash') {
    payload.amountGiven = parseFloat(amountGivenInput.value);
  }

  generateBillBtn.disabled = true;
  generateBillBtn.textContent = 'Generating...';

  try {
    const res = await fetch('/api/billing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Failed to generate bill.');
      generateBillBtn.disabled = false;
      generateBillBtn.textContent = 'Generate Bill';
      return;
    }

    showReceipt(data);
    resetCart();
  } catch (err) {
    alert('Network error while generating bill.');
  } finally {
    generateBillBtn.textContent = 'Generate Bill';
  }
}

function showReceipt(bill) {
  const dateObj = new Date(bill.billDatetime);
  const dateStr = dateObj.toLocaleString();

  let itemsHtml = bill.items.map(i => `
    <div class="r-row">
      <span>${escapeHtml(i.name)} (${escapeHtml(i.variant)}) x${i.qty}</span>
      <span>₹${i.lineTotal.toFixed(2)}</span>
    </div>
  `).join('');

  let paymentHtml = `<div class="r-row"><span>Payment Mode</span><span>${bill.paymentMode}</span></div>`;
  if (bill.paymentMode === 'Cash') {
    paymentHtml += `
      <div class="r-row"><span>Amount Given</span><span>₹${bill.amountGiven.toFixed(2)}</span></div>
      <div class="r-row"><span>Balance Returned</span><span>₹${bill.balance.toFixed(2)}</span></div>
    `;
  }

  receiptContent.innerHTML = `
    <div class="r-shop">${escapeHtml(bill.shopName)}</div>
    <div class="r-sub">Bill No: ${bill.billNo}<br>${dateStr}</div>
    <hr>
    ${itemsHtml}
    <hr>
    <div class="r-row r-total"><span>TOTAL</span><span>₹${bill.total.toFixed(2)}</span></div>
    <hr>
    ${paymentHtml}
    <div class="r-sub" style="margin-top:14px;">Thank you! Visit again.</div>
  `;

  receiptOverlay.classList.add('open');
}

function resetCart() {
  cart = [];
  amountGivenInput.value = '';
  qrPaidCheckbox.checked = false;
  balanceDisplay.classList.add('hidden');
  setPaymentMode('Cash');
  updateCartUI();
}

// ---------------- Event bindings ----------------
function bindEvents() {
  categoryTabs.querySelectorAll('.category-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      categoryTabs.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentCategory = tab.dataset.cat;
      renderProductGrid();
    });
  });

  payCashBtn.addEventListener('click', () => setPaymentMode('Cash'));
  payQrBtn.addEventListener('click', () => setPaymentMode('QR Code'));

  amountGivenInput.addEventListener('input', () => {
    updatePaymentSection(getTotal());
    validateGenerateButton(getTotal());
  });

  qrPaidCheckbox.addEventListener('change', () => validateGenerateButton(getTotal()));

  generateBillBtn.addEventListener('click', generateBill);
  clearCartBtn.addEventListener('click', () => {
    if (cart.length && !confirm('Clear the current bill?')) return;
    resetCart();
  });

  closeReceiptBtn.addEventListener('click', () => receiptOverlay.classList.remove('open'));
  receiptOverlay.addEventListener('click', (e) => {
    if (e.target === receiptOverlay) receiptOverlay.classList.remove('open');
  });
}

init();
