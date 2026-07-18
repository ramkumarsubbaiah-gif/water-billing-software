// ===================== Admin Panel Logic =====================

const loginView = document.getElementById('loginView');
const panelView = document.getElementById('panelView');
const loginBtn = document.getElementById('loginBtn');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const loginAlert = document.getElementById('loginAlert');
const logoutBtn = document.getElementById('logoutBtn');
const loggedInUser = document.getElementById('loggedInUser');

const settingsShopName = document.getElementById('settingsShopName');
const settingsUpiId = document.getElementById('settingsUpiId');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const settingsAlert = document.getElementById('settingsAlert');

const productForm = document.getElementById('productForm');
const productFormTitle = document.getElementById('productFormTitle');
const productIdInput = document.getElementById('productId');
const pName = document.getElementById('pName');
const pCategory = document.getElementById('pCategory');
const pVariant = document.getElementById('pVariant');
const pPrice = document.getElementById('pPrice');
const pImage = document.getElementById('pImage');
const pActive = document.getElementById('pActive');
const imageUploadBox = document.getElementById('imageUploadBox');
const imagePreviewArea = document.getElementById('imagePreviewArea');
const saveProductBtn = document.getElementById('saveProductBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const productFormAlert = document.getElementById('productFormAlert');

const productsTableBody = document.getElementById('productsTableBody');

let editingProductId = null;
let existingImageForEdit = null;

// ---------------- Session check ----------------
async function checkSession() {
  const res = await fetch('/api/auth/session');
  const data = await res.json();
  if (data.isAdmin) {
    showPanel(data.username);
  } else {
    showLogin();
  }
}

function showLogin() {
  loginView.classList.remove('hidden');
  panelView.classList.add('hidden');
}

function showPanel(username) {
  loginView.classList.add('hidden');
  panelView.classList.remove('hidden');
  loggedInUser.textContent = username || 'admin';
  loadSettings();
  loadProducts();
}

// ---------------- Login / Logout ----------------
loginBtn.addEventListener('click', async () => {
  loginAlert.innerHTML = '';
  const username = loginUsername.value.trim();
  const password = loginPassword.value;
  if (!username || !password) {
    loginAlert.innerHTML = '<div class="alert alert-error">Please enter username and password.</div>';
    return;
  }
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) {
      loginAlert.innerHTML = `<div class="alert alert-error">${escapeHtml(data.error || 'Login failed.')}</div>`;
      return;
    }
    loginPassword.value = '';
    showPanel(data.username);
  } catch (err) {
    loginAlert.innerHTML = '<div class="alert alert-error">Network error. Try again.</div>';
  }
});

loginPassword.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loginBtn.click();
});

logoutBtn.addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  showLogin();
});

// ---------------- Shop settings ----------------
async function loadSettings() {
  const res = await fetch('/api/settings');
  const data = await res.json();
  settingsShopName.value = data.shopName;
  settingsUpiId.value = data.upiId;
  document.getElementById('shopNameHeader').textContent = data.shopName;
}

saveSettingsBtn.addEventListener('click', async () => {
  settingsAlert.innerHTML = '';
  try {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopName: settingsShopName.value, upiId: settingsUpiId.value })
    });
    const data = await res.json();
    if (!res.ok) {
      settingsAlert.innerHTML = `<div class="alert alert-error">${escapeHtml(data.error || 'Failed to save.')}</div>`;
      return;
    }
    settingsAlert.innerHTML = '<div class="alert alert-success">Settings saved.</div>';
    document.getElementById('shopNameHeader').textContent = data.shopName;
    setTimeout(() => { settingsAlert.innerHTML = ''; }, 2500);
  } catch (err) {
    settingsAlert.innerHTML = '<div class="alert alert-error">Network error.</div>';
  }
});

// ---------------- Product image preview ----------------
imageUploadBox.addEventListener('click', () => pImage.click());
pImage.addEventListener('change', () => {
  const file = pImage.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    imagePreviewArea.innerHTML = `<img src="${e.target.result}" alt="preview">`;
  };
  reader.readAsDataURL(file);
});

// ---------------- Product list ----------------
async function loadProducts() {
  const res = await fetch('/api/products/all');
  if (!res.ok) return;
  const products = await res.json();

  if (products.length === 0) {
    productsTableBody.innerHTML = '<tr><td colspan="7" class="text-muted" style="text-align:center; padding:20px;">No products yet. Add your first product using the form.</td></tr>';
    return;
  }

  productsTableBody.innerHTML = products.map(p => `
    <tr data-id="${p.id}">
      <td>${p.image ? `<img class="thumb-sm" src="/uploads/${p.image}" alt="">` : '—'}</td>
      <td>${escapeHtml(p.name)}</td>
      <td><span class="badge ${p.category === 'Water' ? 'badge-water' : 'badge-cold'}">${escapeHtml(p.category)}</span></td>
      <td>${escapeHtml(p.variant)}</td>
      <td>₹${p.price.toFixed(2)}</td>
      <td>${p.active ? '<span class="badge" style="background:#EAF7EC;color:#2F9E44;">Active</span>' : '<span class="badge badge-inactive">Inactive</span>'}</td>
      <td class="row-actions">
        <button class="btn btn-outline edit-btn">Edit</button>
        <button class="btn btn-danger delete-btn">Delete</button>
      </td>
    </tr>
  `).join('');

  productsTableBody.querySelectorAll('tr').forEach(row => {
    const id = parseInt(row.dataset.id, 10);
    const product = products.find(p => p.id === id);
    row.querySelector('.edit-btn').addEventListener('click', () => startEditProduct(product));
    row.querySelector('.delete-btn').addEventListener('click', () => deleteProduct(product));
  });
}

function startEditProduct(product) {
  editingProductId = product.id;
  existingImageForEdit = product.image;
  productIdInput.value = product.id;
  pName.value = product.name;
  pCategory.value = product.category;
  pVariant.value = product.variant;
  pPrice.value = product.price;
  pActive.checked = !!product.active;
  imagePreviewArea.innerHTML = product.image
    ? `<img src="/uploads/${product.image}" alt="">`
    : '📷 Click to upload image';
  productFormTitle.textContent = '✏️ Edit Product';
  saveProductBtn.textContent = 'Update Product';
  cancelEditBtn.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetProductForm() {
  editingProductId = null;
  existingImageForEdit = null;
  productForm.reset();
  productIdInput.value = '';
  pActive.checked = true;
  imagePreviewArea.innerHTML = '📷 Click to upload image';
  productFormTitle.textContent = '➕ Add Product';
  saveProductBtn.textContent = 'Add Product';
  cancelEditBtn.classList.add('hidden');
  productFormAlert.innerHTML = '';
}

cancelEditBtn.addEventListener('click', resetProductForm);

productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  productFormAlert.innerHTML = '';

  const formData = new FormData();
  formData.append('name', pName.value.trim());
  formData.append('category', pCategory.value);
  formData.append('variant', pVariant.value.trim());
  formData.append('price', pPrice.value);
  formData.append('active', pActive.checked ? 'true' : 'false');
  if (pImage.files[0]) {
    formData.append('image', pImage.files[0]);
  }

  const url = editingProductId ? `/api/products/${editingProductId}` : '/api/products';
  const method = editingProductId ? 'PUT' : 'POST';

  saveProductBtn.disabled = true;
  try {
    const res = await fetch(url, { method, body: formData });
    const data = await res.json();
    if (!res.ok) {
      productFormAlert.innerHTML = `<div class="alert alert-error">${escapeHtml(data.error || 'Failed to save product.')}</div>`;
      return;
    }
    resetProductForm();
    loadProducts();
  } catch (err) {
    productFormAlert.innerHTML = '<div class="alert alert-error">Network error.</div>';
  } finally {
    saveProductBtn.disabled = false;
  }
});

async function deleteProduct(product) {
  if (!confirm(`Delete "${product.name} (${product.variant})"? This cannot be undone.`)) return;
  try {
    const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Failed to delete product.');
      return;
    }
    loadProducts();
  } catch (err) {
    alert('Network error while deleting product.');
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

checkSession();
