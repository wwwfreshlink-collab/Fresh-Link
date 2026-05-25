/* ============================================================
   FreshLink — shop.js  (Fixed: all 20 products render)
   ============================================================ */
'use strict';

let allProducts      = [];
let filteredProducts = [];
let currentFilter    = 'all';
let currentSort      = '';
let currentSearch    = '';
let displayedCount   = 0;
const PAGE_SIZE      = 30;   // batch size – updated to 30 products as requested
let isLoading        = false;

document.addEventListener('DOMContentLoaded', async () => {
  // Try to load from Supabase first
  allProducts = await loadProductsFromSupabase();
  
  if (!allProducts || allProducts.length === 0) {
    // Fallback to local storage or defaults
    allProducts = (typeof getProducts === 'function') ? getProducts() : SHOP_PRODUCT_LIST;
  }

  // Handle URL parameters for filtering (e.g., shop.html?cat=leafy)
  const urlParams = new URLSearchParams(window.location.search);
  const catParam = urlParams.get('cat');
  if (catParam) {
    currentFilter = catParam.toLowerCase();
    // Update pill UI
    document.querySelectorAll('.pill').forEach(p => {
      p.classList.remove('on');
      const onclickAttr = p.getAttribute('onclick') || '';
      if (onclickAttr.includes(`'${currentFilter}'`)) {
        p.classList.add('on');
      }
    });
  }

  applyFilterSort();
  setupInfiniteScroll();
});

/* ================= SUPABASE ================= */

async function loadProductsFromSupabase() {
  if (!supabaseClient) {
    console.warn('Supabase not initialized, using local data.');
    return null;
  }
  try {
    const { data, error } = await supabaseClient
      .from('products')
      .select('*');

    if (error) {
      console.error('Error loading products from Supabase:', error);
      return null;
    }
    
    if (data && data.length > 0) {
      localStorage.setItem(LS_PRODUCTS, JSON.stringify(data));
      return data;
    }
  } catch (e) {
    console.error('Supabase fetch exception:', e);
  }
  return null;
}

/* ================= FILTER & SORT ================= */

function setFilter(cat, el) {
  currentFilter = cat;
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('on'));
  if (el) el.classList.add('on');
  displayedCount = 0;
  applyFilterSort();
}

function doSort(val) {
  currentSort = val;
  applyFilterSort();
}

function doSearch(val) {
  currentSearch = (val || '').trim().toLowerCase();
  displayedCount = 0;
  applyFilterSort();
}

function applyFilterSort() {
  if (!allProducts || allProducts.length === 0) {
    allProducts = (typeof getProducts === 'function') ? getProducts() : SHOP_PRODUCT_LIST;
  }

  // Normalize current filter
  const filter = currentFilter.toLowerCase();

  // 1. Filter by category
  filteredProducts = allProducts.filter(p => {
    const pName = (p.name || '').toLowerCase();
    const pCat  = (p.category || '').toLowerCase();
    
    // Case: 'all' shows everything
    if (filter === 'all') return true;

    // Determine the product's effective category
    let effectiveCat = pCat;
    
    // Fallback logic for legacy 'vegetable' or missing categories
    if (!effectiveCat || effectiveCat === 'vegetable' || effectiveCat === 'vegetables') {
      effectiveCat = categorizeVegetable(pName);
    }

    // Special handling for Fruit (include common variations)
    if (filter === 'fruit' || filter === 'fruits') {
      return effectiveCat === 'fruit' || effectiveCat === 'fruits' || pName.includes('apple') || pName.includes('fruit');
    }

    // Standard matching for other categories (leafy, root, etc.)
    return effectiveCat === filter;
  });

  // 2. Filter by search term
  if (currentSearch) {
    filteredProducts = filteredProducts.filter(p => 
      (p.name || '').toLowerCase().includes(currentSearch) ||
      (p.desc || '').toLowerCase().includes(currentSearch) ||
      (p.category || '').toLowerCase().includes(currentSearch)
    );
  }

  // 3. Sort
  if (currentSort === 'pa') {
    filteredProducts.sort((a, b) => a.price - b.price);
  } else if (currentSort === 'pd') {
    filteredProducts.sort((a, b) => b.price - a.price);
  } else if (currentSort === 'rating') {
    filteredProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  const countEl = document.getElementById('prodCount');
  if (countEl) countEl.textContent =
    `${filteredProducts.length} product${filteredProducts.length !== 1 ? 's' : ''}`;

  const grid = document.getElementById('prodGrid') || document.getElementById('featuredGrid');
  if (grid) { 
    grid.innerHTML = ''; 
    displayedCount = 0; 
    loadMoreProducts();
    
    setTimeout(() => {
       const sentinel = document.getElementById('sentinel');
       if (sentinel && sentinel.style.display !== 'none') {
         const rect = sentinel.getBoundingClientRect();
         if (rect.top <= (window.innerHeight || document.documentElement.clientHeight)) {
           loadMoreProducts();
         }
       }
    }, 500);
  }
}

/* ================= LOAD PRODUCTS ================= */

function loadMoreProducts() {
  const grid = document.getElementById('prodGrid') || document.getElementById('featuredGrid');
  if (!grid || isLoading) return;

  const isFeatured = !!document.getElementById('featuredGrid');
  const limit      = isFeatured ? 8 : PAGE_SIZE;

  if (displayedCount >= filteredProducts.length) {
    const sentinel = document.getElementById('sentinel');
    if (sentinel) sentinel.style.display = 'none';
    return;
  }

  isLoading = true;

  const slice = filteredProducts.slice(displayedCount, displayedCount + limit);
  slice.forEach(p => grid.insertAdjacentHTML('beforeend', buildProductCard(p)));
  displayedCount += slice.length;

  if (typeof lucide !== 'undefined') lucide.createIcons();
  updateAllBadges();

  isLoading = false;

  const sentinel = document.getElementById('sentinel');
  if (sentinel && displayedCount < filteredProducts.length) {
    sentinel.style.display = 'block';
    const rect = sentinel.getBoundingClientRect();
    if (rect.top <= (window.innerHeight || document.documentElement.clientHeight) + 100) {
      loadMoreProducts();
    }
  } else if (sentinel) {
    sentinel.style.display = 'none';
  }
}

/* ================= PRODUCT CARD ================= */

function buildProductCard(p) {
  const cart     = getCart();
  const cartItem = cart.find(x => String(x.id) === String(p.id));

  const price       = (p.discount_price && p.discount_price < p.price) ? p.discount_price : p.price;
  const hasDiscount = p.discount_price && p.discount_price < p.price;

  const badgeHtml = p.badge
    ? `<span class="prod-badge badge-${p.badge}">${p.badge}</span>`
    : '';

  const priceHtml = hasDiscount
    ? `<span class="old-price">${fmt(p.price)}</span>${fmt(price)}<span>/${p.unit}</span>`
    : `${fmt(price)}<span>/${p.unit}</span>`;

  const addCtrlHtml = cartItem
    ? `<div class="qty-ctrl" id="qtyCtrl_${p.id}">
         <button class="qty-btn" onclick="changeQty('${p.id}',-1)">−</button>
         <span class="qty-num" id="qtyNum_${p.id}">${cartItem.qty}</span>
         <button class="qty-btn" onclick="changeQty('${p.id}',1)">+</button>
       </div>`
    : `<button class="add-btn" id="addBtn_${p.id}" onclick="handleAdd('${p.id}')">+</button>`;

  return `
  <article class="prod-card">
    <div class="prod-card-img-wrap">
      <img src="${p.image}" alt="${p.name}" loading="lazy"
           onerror="this.src='assets/images/default.jpg'" />
      ${badgeHtml}
    </div>
    <div class="prod-card-body">
      <div class="prod-card-farm">${p.farm}</div>
      <div class="prod-card-name">${p.name}</div>
      <div class="prod-card-desc">${p.desc}</div>
      <div class="prod-card-rating">
        <span class="stars">${renderStars(p.rating)}</span>
        <span>${p.rating}</span>
        <span>(${p.reviews})</span>
      </div>
      <div class="prod-card-footer">
        <div class="prod-price">${priceHtml}</div>
        <div id="ctrl_${p.id}">${addCtrlHtml}</div>
      </div>
    </div>
  </article>`;
}

/* ================= CART ================= */

function handleAdd(id) {
  addToCart(id, 1);
  const ctrl = document.getElementById('ctrl_' + id);
  if (!ctrl) return;
  ctrl.innerHTML = `
    <div class="qty-ctrl" id="qtyCtrl_${id}">
      <button class="qty-btn" onclick="changeQty('${id}',-1)">−</button>
      <span class="qty-num" id="qtyNum_${id}">1</span>
      <button class="qty-btn" onclick="changeQty('${id}',1)">+</button>
    </div>`;
}

function changeQty(id, delta) {
  const cart = getCart();
  const item = cart.find(x => String(x.id) === String(id));
  if (!item) return;

  const newQty = item.qty + delta;
  if (newQty <= 0) {
    removeFromCart(id);
    const ctrl = document.getElementById('ctrl_' + id);
    if (ctrl) {
      ctrl.innerHTML = `<button class="add-btn" id="addBtn_${id}" onclick="handleAdd('${id}')">+</button>`;
    }
    return;
  }
  setQty(id, newQty);
  const numEl = document.getElementById('qtyNum_' + id);
  if (numEl) numEl.textContent = newQty;
}

/* ================= INFINITE SCROLL ================= */

function setupInfiniteScroll() {
  const sentinel = document.getElementById('sentinel');
  if (!sentinel) return;

  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && displayedCount < filteredProducts.length) {
      loadMoreProducts();
    }
  }, { rootMargin: '200px' });

  obs.observe(sentinel);
}

/* ================= HELPERS ================= */

function categorizeVegetable(name) {
  const n = name.toLowerCase();
  const leafyKeywords = ['spinach', 'methi', 'curry', 'broccoli', 'cauliflower', 'capsicum', 'peas', 'karela', 'drumstick', 'leaves', 'leafy', 'cabbage'];
  return leafyKeywords.some(k => n.includes(k)) ? 'leafy' : 'root';
}

/* ================= PRODUCTS DATA ================= */

const SHOP_PRODUCT_LIST = [
  { id:'spinach', name:'Fresh Spinach',  image:'assets/images/spinach.jpg', farm:'local Farms', desc:'Fresh green spinach.', price:8,  unit:'bunch', rating:4.7, reviews:180, category:'leafy' },
  { id:'carrot',  name:'Organic Carrots', image:'assets/images/carrot.jpg', farm:'local Farms', desc:'Crunchy organic carrots.', price:30, unit:'kg', rating:4.6, reviews:162, category:'root' },
  { id:'brinjal', name:'Brinjal', image:'assets/images/brinjal.jpg', farm:'local Farms', desc:'Fresh brinjals.', price:20, unit:'kg', rating:4.5, reviews:98, category:'root' },
  { id:'potato',  name:'Potato', image:'assets/images/potato.jpg', farm:'local Farms', desc:'Farm potatoes.', price:15, unit:'kg', rating:4.5, reviews:120, category:'root' },
  { id:'capsicum', name:'Fresh Capsicum', image:'assets/images/capsicum.jpg', farm:'local Farms', desc:'Fresh capsicums.', price:65, unit:'kg', rating:4.7, reviews:80, category:'leafy' },
  { id:'cauliflower', name:'Fresh Cauliflower', image:'assets/images/cauliflower.jpg', farm:'local Farms', desc:'Fresh cauliflower.', price:18, unit:'kg', rating:4.7, reviews:80, category:'leafy' },
  { id:'baby-potato', name:'Baby potato', image:'assets/images/babypotato.jpg', farm:'local Farms', desc:'Fresh Baby Potatoes.', price:7, unit:'kg', rating:4.7, reviews:80, category:'root' },
  { id:'curry-leaves', name:'Fresh Curry leaves', image:'assets/images/curryleaves.jpg', farm:'local Farms', desc:'Fresh curry leaves.', price:15, unit:'bunch', rating:4.7, reviews:80, category:'leafy' },
  { id:'red-onion', name:'Red Onion', image:'assets/images/redonion.jpg', farm:'local Farms', desc:'farm Red Onion.', price:16, unit:'kg', rating:4.7, reviews:289, category:'root' },
  { id:'frozen-peas', name:'Frozen Peas', image:'assets/images/frozenpea.jpg', farm:'local Farms', desc:'Frozen Peas.', price:80, unit:'kg', rating:4.6, reviews:134, category:'leafy' },
  { id:'karela', name:'Karela', image:'assets/images/karela.jpg', farm:'local Farms', desc:'Karela.', price:50, unit:'kg', rating:4.2, reviews:76, category:'leafy' },
  { id:'drumstick', name:'Drumstick', image:'assets/images/drumstick.jpg', farm:'local Farms', desc:'Drum Stick.', price:40, unit:'kg', rating:4.5, reviews:91, category:'leafy' },
  { id:'lady-finger', name:'Lady Finger', image:'assets/images/ladyfinger.jpg', farm:'local Farms', desc:'Lady Finger.', price:50, unit:'kg', rating:4.7, reviews:183, category:'root' },
  { id:'bottle-gaurd', name:'Bottle gaurd', image:'assets/images/bottlegurad.jpg', farm:'local Farms', desc:'Bottle gaurd.', price:8, unit:'kg', rating:4.4, reviews:102, category:'root' },
  { id:'methi', name:'Fresh Methi', image:'assets/images/methi.jpg', farm:'local Farms', desc:'Fresh Methi.', price:10, unit:'bunch', rating:4.6, reviews:147, category:'leafy' },
  { id:'corn', name:'Corn', image:'assets/images/corn.jpg', farm:'local Farms', desc:'Corn.', price:20, unit:'kg', rating:4.8, reviews:219, category:'root' },
  { id:'radish', name:'Radish', image:'assets/images/radish.jpg', farm:'local Farms', desc:'Radish.', price:8, unit:'bunch', rating:4.4, reviews:62, category:'root' },
  { id:'broccoli', name:'Broccoli', image:'assets/images/broccoli.jpg', farm:'local Farms', desc:'Broccoli.', price:60, unit:'kg', rating:4.7, reviews:80, category:'leafy' },
  { id:'mushroom', name:'Fresh Mushroom', image:'assets/images/mushroom.jpg', farm:'local Farms', desc:'Fresh Mushroom.', price:50, unit:'250g box', rating:4.7, reviews:80, category:'root' },
  { id:'red-apple', name:'Kashmiri Red Apple', image:'assets/images/redapple.jpg', farm:'local Farms', desc:'Fresh Red Apples.', price:120, unit:'kg', rating:4.9, reviews:310, category:'fruit' }
];

/* Seed localStorage so cart.js can find products by ID */
(function seedProducts() {
  try {
    const stored = localStorage.getItem(LS_PRODUCTS);
    // Only seed if localStorage is empty or broken
    if (!stored || stored === '[]' || stored === 'null') {
      localStorage.setItem(LS_PRODUCTS, JSON.stringify(SHOP_PRODUCT_LIST));
    }
  } catch(e) {
    localStorage.setItem(LS_PRODUCTS, JSON.stringify(SHOP_PRODUCT_LIST));
  }
}());