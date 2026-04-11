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

document.addEventListener('DOMContentLoaded', () => {
  allProducts = SHOP_PRODUCT_LIST;
  applyFilterSort();
  setupInfiniteScroll();
});

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

  // 1. Filter by category
  let filtered = currentFilter === 'all'
    ? [...allProducts]
    : allProducts.filter(p => {
        const cat = (p.category || '').toLowerCase();
        if (currentFilter === 'vegetable') {
          return cat === 'vegetable' || cat === 'vegetables';
        }
        if (currentFilter === 'fruit' || currentFilter === 'fruits') {
          return cat === 'fruit' || cat === 'fruits';
        }
        return cat === currentFilter.toLowerCase();
      });

  // 2. Filter by search term
  if (currentSearch) {
    filtered = filtered.filter(p => 
      (p.name || '').toLowerCase().includes(currentSearch) ||
      (p.desc || '').toLowerCase().includes(currentSearch) ||
      (p.category || '').toLowerCase().includes(currentSearch)
    );
  }

  // 3. Sort
  if (currentSort === 'pa') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (currentSort === 'pd') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (currentSort === 'rating') {
    filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  filteredProducts = filtered;

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
  const cartItem = cart.find(x => x.id === p.id);

  const price       = (p.discountPrice && p.discountPrice < p.price) ? p.discountPrice : p.price;
  const hasDiscount = p.discountPrice && p.discountPrice < p.price;

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
    <div class="qty-ctrl">
      <button class="qty-btn" onclick="changeQty('${id}',-1)">−</button>
      <span class="qty-num" id="qtyNum_${id}">1</span>
      <button class="qty-btn" onclick="changeQty('${id}',1)">+</button>
    </div>`;
}

function changeQty(id, delta) {
  const cart = getCart();
  const item = cart.find(x => x.id === id);
  if (!item) return;

  const newQty = item.qty + delta;
  if (newQty <= 0) {
    removeFromCart(id);
    document.getElementById('ctrl_' + id).innerHTML =
      `<button onclick="handleAdd('${id}')">+</button>`;
    return;
  }
  setQty(id, newQty);
  document.getElementById('qtyNum_' + id).textContent = newQty;
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

/* ================= PRODUCTS DATA ================= */

const SHOP_PRODUCT_LIST = [
  { id:'tomato',  name:'Desi Tomatoes', image:'assets/images/tomato.jpg', farm:'local Farms', desc:'Fresh juicy tomatoes.', price:15, unit:'kg', rating:4.8, reviews:214, category:'vegetable' },
  { id:'spinach', name:'Fresh Spinach',  image:'assets/images/spinach.jpg', farm:'local Farms', desc:'Fresh green spinach.', price:8,  unit:'bunch', rating:4.7, reviews:180, category:'vegetable' },
  { id:'carrot',  name:'Organic Carrots', image:'assets/images/carrot.jpg', farm:'local Farms', desc:'Crunchy organic carrots.', price:30, unit:'kg', rating:4.6, reviews:162, category:'vegetable' },
  { id:'brinjal', name:'Brinjal', image:'assets/images/brinjal.jpg', farm:'local Farms', desc:'Fresh brinjals.', price:20, unit:'kg', rating:4.5, reviews:98, category:'vegetable' },
  { id:'potato',  name:'Potato', image:'assets/images/potato.jpg', farm:'local Farms', desc:'Farm potatoes.', price:15, unit:'kg', rating:4.5, reviews:120, category:'vegetable' },
  { id:'capsicum', name:'Fresh Capsicum', image:'assets/images/capsicum.jpg', farm:'local Farms', desc:'Fresh capsicums.', price:65, unit:'kg', rating:4.7, reviews:80, category:'vegetable' },
  { id:'cauliflower', name:'Fresh Cauliflower', image:'assets/images/cauliflower.jpg', farm:'local Farms', desc:'Fresh cauliflower.', price:18, unit:'kg', rating:4.7, reviews:80, category:'vegetable' },
  { id:'baby-potato', name:'Baby potato', image:'assets/images/babypotato.jpg', farm:'local Farms', desc:'Fresh Baby Potatoes.', price:7, unit:'kg', rating:4.7, reviews:80, category:'vegetable' },
  { id:'curry-leaves', name:'Fresh Curry leaves', image:'assets/images/curryleaves.jpg', farm:'local Farms', desc:'Fresh curry leaves.', price:15, unit:'bunch', rating:4.7, reviews:80, category:'vegetable' },
  { id:'red-onion', name:'Red Onion', image:'assets/images/redonion.jpg', farm:'local Farms', desc:'farm Red Onion.', price:16, unit:'kg', rating:4.7, reviews:289, category:'vegetable' },
  { id:'frozen-peas', name:'Frozen Peas', image:'assets/images/frozenpea.jpg', farm:'local Farms', desc:'Frozen Peas.', price:80, unit:'kg', rating:4.6, reviews:134, category:'vegetable' },
  { id:'karela', name:'Karela', image:'assets/images/karela.jpg', farm:'local Farms', desc:'Karela.', price:50, unit:'kg', rating:4.2, reviews:76, category:'vegetable' },
  { id:'drumstick', name:'Drumstick', image:'assets/images/drumstick.jpg', farm:'local Farms', desc:'Drum Stick.', price:40, unit:'kg', rating:4.5, reviews:91, category:'vegetable' },
  { id:'lady-finger', name:'Lady Finger', image:'assets/images/ladyfinger.jpg', farm:'local Farms', desc:'Lady Finger.', price:50, unit:'kg', rating:4.7, reviews:183, category:'vegetable' },
  { id:'bottle-gaurd', name:'Bottle gaurd', image:'assets/images/bottlegurad.jpg', farm:'local Farms', desc:'Bottle gaurd.', price:8, unit:'kg', rating:4.4, reviews:102, category:'vegetable' },
  { id:'methi', name:'Fresh Methi', image:'assets/images/methi.jpg', farm:'local Farms', desc:'Fresh Methi.', price:10, unit:'bunch', rating:4.6, reviews:147, category:'vegetable' },
  { id:'corn', name:'Corn', image:'assets/images/corn.jpg', farm:'local Farms', desc:'Corn.', price:20, unit:'kg', rating:4.8, reviews:219, category:'vegetable' },
  { id:'radish', name:'Radish', image:'assets/images/radish.jpg', farm:'local Farms', desc:'Radish.', price:8, unit:'bunch', rating:4.4, reviews:62, category:'vegetable' },
  { id:'broccoli', name:'Broccoli', image:'assets/images/broccoli.jpg', farm:'local Farms', desc:'Broccoli.', price:60, unit:'kg', rating:4.7, reviews:80, category:'vegetable' },
  { id:'mushroom', name:'Fresh Mushroom', image:'assets/images/mushroom.jpg', farm:'local Farms', desc:'Fresh Mushroom.', price:50, unit:'250g box', rating:4.7, reviews:80, category:'vegetable' },
  { id:'red-apple', name:'Kashmiri Red Apple', image:'assets/images/redapple.jpg', farm:'local Farms', desc:'Fresh Red Apples.', price:120, unit:'kg', rating:4.9, reviews:310, category:'fruit' }
];

/* Seed localStorage so cart.js can find products by ID */
(function seedProducts() {
  try {
    const stored = localStorage.getItem(LS_PRODUCTS);
    const parsed = stored ? JSON.parse(stored) : null;
    if (!parsed || parsed.length !== SHOP_PRODUCT_LIST.length) {
      localStorage.setItem(LS_PRODUCTS, JSON.stringify(SHOP_PRODUCT_LIST));
    }
  } catch(e) {
    localStorage.setItem(LS_PRODUCTS, JSON.stringify(SHOP_PRODUCT_LIST));
  }
}());