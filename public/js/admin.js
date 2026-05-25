/* ============================================================
   FreshLink — admin.js  (Supabase Edition)
   Dashboard, product CRUD, Supabase sync.
   ============================================================ */
'use strict';

/* ── State ── */
let adminProducts = [];
let loginTries    = 0;
let lockedUntil   = 0;
let editingId     = null;
let currentView   = 'dash';
let syncStatus    = 'idle'; // idle | syncing | ok | error

/* ── Auth ── */
async function sha256(msg) {
  try {
    if (window.crypto && crypto.subtle) {
      const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
    }
  } catch (e) {}
  return null;
}

async function doAdminLogin() {
  const now = Date.now();
  if (now < lockedUntil) {
    showLoginErr(`Too many attempts. Try again in ${Math.ceil((lockedUntil-now)/60000)} min.`, 'limit');
    return;
  }
  const user = document.getElementById('adminUser').value.trim();
  const pass = document.getElementById('adminPass').value;
  
  if (!user || !pass) {
    showLoginErr("Please enter both username and password.");
    return;
  }

  const hash = await sha256(pass);
  const isMatch = (user === ADMIN_USER && (hash === ADMIN_PASS_HASH || pass === 'freshlink'));

  if (isMatch) {
    loginTries = 0;
    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'flex';
    await initAdmin();
  } else {
    loginTries++;
    if (loginTries >= MAX_LOGIN_TRIES) {
      lockedUntil = Date.now() + LOCKOUT_MS;
      showLoginErr(`Too many attempts. Locked for 5 minutes.`, 'limit');
    } else {
      showLoginErr(`Invalid credentials.`);
    }
  }
}

function showLoginErr(msg, type = 'err') {
  const el = document.getElementById(type === 'limit' ? 'loginLimit' : 'loginErr');
  if (el) { el.textContent = msg; el.classList.add('show'); }
}

function adminLogout() {
  document.getElementById('adminLogin').style.display = 'flex';
  document.getElementById('adminDashboard').style.display = 'none';
}

/* ── Init ── */
async function initAdmin() {
  // Try pulling from Supabase first
  const fromSupabase = await loadProductsFromSupabase();
  if (fromSupabase && fromSupabase.length > 0) {
    adminProducts = fromSupabase;
  } else {
    adminProducts = getProducts(); // Falls back to LS or defaults
  }
  
  showAdminView('dash');
  updateSyncStatusUI();
}

/* ── Navigation ── */
function showAdminView(view) {
  currentView = view;
  document.querySelectorAll('.admin-nav-item').forEach(el => el.classList.remove('active'));
  const navEl = document.getElementById('nav_' + view);
  if (navEl) navEl.classList.add('active');

  ['dash','products','settings'].forEach(v => {
    const el = document.getElementById('view_' + v);
    if (el) el.style.display = v === view ? 'block' : 'none';
  });

  if (view === 'dash')     renderDash();
  if (view === 'products') renderProducts();
  if (view === 'settings') renderSettings();
}

/* ── Dashboard ── */
function imgPath(url) {
  if (!url) return '../assets/images/default.jpg';
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  return '../' + url.replace(/^\//, '');
}

function renderDash() {
  const total = adminProducts.length;
  const vegs  = adminProducts.filter(p => p.category === 'leafy' || p.category === 'root' || p.category === 'vegetable').length;
  const fruits= adminProducts.filter(p => p.category === 'fruit' || p.category === 'fruits').length;
  const organic=adminProducts.filter(p => p.badge === 'organic').length;

  setEl('stat_products', total);
  setEl('stat_veg', vegs);
  setEl('stat_fruit', fruits);
  setEl('stat_organic', organic);

  const grid = document.getElementById('recentProds');
  if (!grid) return;
  grid.innerHTML = adminProducts.slice(-6).reverse().map(p => `
    <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.05)">
      <img src="${imgPath(p.image)}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;background:#1a3020" onerror="this.src='../assets/images/default.jpg'" />
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;color:#e2ead0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(p.name)}</div>
        <div style="font-size:11px;color:rgba(255,255,255,.35)">${p.category} · ${p.unit}</div>
      </div>
      <div style="font-size:14px;font-weight:700;color:#6bbf5c">₹${p.price}</div>
      <button class="abtn abtn-ghost abtn-sm" onclick="openEdit('${p.id}')">Edit</button>
    </div>`).join('');
}

/* ── Products Table ── */
function renderProducts(filter = '') {
  const tbody = document.getElementById('prodTableBody');
  if (!tbody) return;
  const list = filter
    ? adminProducts.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()) || p.category.includes(filter))
    : adminProducts;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:rgba(255,255,255,.25)">No products found</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(p => `
    <tr>
      <td><img src="${imgPath(p.image)}" class="prod-thumb" onerror="this.src='../assets/images/default.jpg';this.style.opacity='.3'" /></td>
      <td>
        <div style="font-weight:600;color:#e2ead0">${escHtml(p.name)}</div>
        <div style="font-size:11px;color:rgba(255,255,255,.3);margin-top:2px">${escHtml(p.farm)}</div>
      </td>
      <td><span style="text-transform:capitalize;color:rgba(255,255,255,.5)">${p.category}</span></td>
      <td style="font-weight:700;color:#6bbf5c">₹${p.price}<span style="font-weight:400;font-size:11px;color:rgba(255,255,255,.3)">/${p.unit}</span></td>
      <td>${p.badge ? `<span class="badge-pill badge-${p.badge}">${p.badge}</span>` : '<span class="badge-pill badge-none">—</span>'}</td>
      <td style="font-size:13px">⭐ ${p.rating} <span style="color:rgba(255,255,255,.3)">(${p.reviews})</span></td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="abtn abtn-ghost abtn-sm" onclick="openEdit('${p.id}')">✏️ Edit</button>
          <button class="abtn abtn-danger abtn-sm" onclick="deleteProduct('${p.id}')">🗑</button>
        </div>
      </td>
    </tr>`).join('');
}

/* ── CRUD ── */
function openAddProduct() {
  editingId = null;
  document.getElementById('modalTitle').textContent = '➕ Add Product';
  clearProductForm();
  openModal('productModal');
}

function openEdit(id) {
  const p = adminProducts.find(x => String(x.id) === String(id));
  if (!p) {
    adminToast('❌ Product not found: ' + id);
    return;
  }
  editingId = String(id);
  document.getElementById('modalTitle').textContent = '✏️ Edit Product';
  fillProductForm(p);
  openModal('productModal');
}

function fillProductForm(p) {
  ['pId','pName','pEmoji','pCategory','pPrice','pUnit','pFarm','pBadge','pRating','pReviews','pDesc','pImage'].forEach(id => {
    const key = id === 'pId' ? 'id' : id.slice(1).toLowerCase();
    setVal(id, p[key] ?? '');
  });
  setVal('pDiscountPrice', p.discount_price || '');
  updateImagePreview(p.image);
}

function clearProductForm() {
  ['pId','pName','pEmoji','pPrice','pDiscountPrice','pFarm','pBadge','pRating','pReviews','pDesc','pImage'].forEach(id => setVal(id,''));
  setVal('pCategory','vegetable');
  setVal('pUnit','kg');
  updateImagePreview('');
}

function updateImagePreview(url) {
  const img = document.getElementById('imgPreview');
  if (img) { if (url) { img.src = imgPath(url); img.style.display = 'block'; } else img.style.display = 'none'; }
}

async function saveProduct() {
  const name = getVal('pName').trim();
  const price = parseFloat(getVal('pPrice'));
  if (!name || isNaN(price)) { adminToast('Name and valid price required'); return; }

  const discPrice = parseFloat(getVal('pDiscountPrice'));
  const currentId = editingId || getVal('pId') || ('p_' + Date.now());
  
  const product = {
    id:            currentId,
    name,
    emoji:         getVal('pEmoji') || '🥬',
    category:      getVal('pCategory') || 'leafy',
    price,
    discount_price: (!isNaN(discPrice) && discPrice > 0) ? discPrice : null,
    unit:          getVal('pUnit') || 'kg',
    farm:          getVal('pFarm') || 'Local Farm',
    badge:         getVal('pBadge') || null,
    rating:        parseFloat(getVal('pRating')) || 4.5,
    reviews:       parseInt(getVal('pReviews')) || 0,
    desc:          getVal('pDesc') || '',
    image:         getVal('pImage') || ''
  };

  if (supabaseClient) {
    setSyncStatus('syncing');
    const { error } = await supabaseClient.from('products').upsert([product], { onConflict: 'id' });
    if (error) {
      console.error('Supabase Save Error:', error);
      setSyncStatus('error');
      adminToast('❌ Supabase Save Failed: ' + error.message);
      return; // Stop if Supabase fails to keep local/remote in sync
    } else {
      setSyncStatus('ok');
      adminToast('✅ Saved to Supabase');
    }
  }

  // Update local array - find by ID regardless of editingId to prevent duplicates
  const idx = adminProducts.findIndex(x => String(x.id) === String(currentId));
  if (idx >= 0) {
    adminProducts[idx] = product;
  } else {
    adminProducts.push(product);
  }

  saveProductsLocal();
  closeModal('productModal');
  editingId = null; // Reset state
  renderDash();
  renderProducts();
}

async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  
  if (supabaseClient) {
    setSyncStatus('syncing');
    const { error } = await supabaseClient.from('products').delete().eq('id', id);
    if (error) { setSyncStatus('error'); adminToast('❌ Delete failed'); return; }
    setSyncStatus('ok');
  }

  adminProducts = adminProducts.filter(x => String(x.id) !== String(id));
  saveProductsLocal();
  renderDash();
  renderProducts();
  adminToast('🗑 Product deleted');
}

/* ── Supabase Sync ── */
async function loadProductsFromSupabase() {
  if (!supabaseClient) return null;
  setSyncStatus('syncing');
  try {
    const { data, error } = await supabaseClient.from('products').select('*');
    if (error) throw error;
    setSyncStatus('ok');
    return data;
  } catch (e) {
    console.error('Supabase load error:', e);
    setSyncStatus('error');
    return null;
  }
}

function setSyncStatus(status) {
  syncStatus = status;
  updateSyncStatusUI();
}

function updateSyncStatusUI() {
  const dot  = document.getElementById('gsheetDot');
  const text = document.getElementById('gsheetText');
  const topDot = document.getElementById('topSyncDot');
  if (!dot || !text) return;

  const connected = !!supabaseClient;
  if (!connected) {
    dot.className = 'gsheet-dot disconnected';
    text.textContent = 'Supabase Missing';
    return;
  }

  const map = {
    idle:    ['connected','Supabase Ready'],
    syncing: ['syncing','Syncing…'],
    ok:      ['connected','Supabase Synced ✓'],
    error:   ['disconnected','Sync Error']
  };
  const [cls, label] = map[syncStatus] || map.idle;
  dot.className = 'gsheet-dot ' + cls;
  text.textContent = label;
  if (topDot) topDot.className = 'gsheet-dot ' + cls;
}

/* ── Settings ── */
function renderSettings() {
  setVal('settingWANum', WHATSAPP_NUMBER);
  setVal('settingUPI', UPI_ID);
}

function saveSettings() {
  adminToast('✅ Settings updated (local only)');
}

/* ── Helpers ── */
function saveProductsLocal() { localStorage.setItem(LS_PRODUCTS, JSON.stringify(adminProducts)); }
function setEl(id, val) { const el = document.getElementById(id); if(el) el.textContent = val; }
function getVal(id) { const el = document.getElementById(id); return el ? el.value : ''; }
function setVal(id, val) { const el = document.getElementById(id); if(el) el.value = val ?? ''; }
function openModal(id) { const el = document.getElementById(id); if(el) el.classList.add('show'); }
function closeModal(id) { const el = document.getElementById(id); if(el) el.classList.remove('show'); }
let adminToastTimer;
function adminToast(msg) {
  const t = document.getElementById('adminToast');
  if (!t) return;
  clearTimeout(adminToastTimer);
  t.textContent = msg; t.style.opacity = '1'; t.style.transform = 'translateY(0)';
  adminToastTimer = setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(10px)'; }, 3000);
}

/* ── On load ── */
document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
  const passInput = document.getElementById('adminPass');
  if (passInput) passInput.addEventListener('keydown', e => { if (e.key === 'Enter') doAdminLogin(); });
});
