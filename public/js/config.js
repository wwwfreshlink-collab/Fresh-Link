/* ============================================================
   FreshLink — config.js  (Launch Edition)
   ============================================================ */
'use strict';

const STORE_NAME      = 'FreshLink';
const MP_CITIES       = ['Bhopal','Indore','Jabalpur','Gwalior','Ujjain','Sagar','Rewa','Satna','Dewas','Ratlam'];
const WHATSAPP_NUMBER = '919424740903';
const UPI_ID          = 'yourbusiness@okicici';
const UPI_NAME        = 'FreshLink Store';

/* Admin */
const ADMIN_USER      = 'freshlink';
const ADMIN_PASS_HASH = 'a0882111c05e913ee928b9352340afce1ef45839a587e08485df2540d3197207';
const MAX_LOGIN_TRIES = 5;
const LOCKOUT_MS      = 5 * 60 * 1000;

/* ── Google Sheets sync ── */
// PASTE YOUR GOOGLE APPS SCRIPT URL HERE to make it work for everyone:
const PERMANENT_GSHEET_URL = 'https://script.google.com/macros/s/AKfycbwP4VnBhNYzCPTjc-BLTt8Vx6nLiOoRy9xcu_TBvmncPF891MIt1XubFSG0_BjAJDwa/exec'; 

var GSHEET_URL = localStorage.getItem('fl_gsheet_url') || PERMANENT_GSHEET_URL; 

/* Storage keys */
const LS_PRODUCTS = 'fl_products_v5';
const LS_CART     = 'fl_cart_v1';
const LS_ORDERS   = 'fl_orders_v1';

/* Delivery */
const FREE_DELIVERY_ABOVE = 299;
const DELIVERY_CHARGE     = 29;
const DELIVERY_HOURS      = 48;

/* ── Helpers ── */
function fmt(n)   { return '₹' + Number(n).toLocaleString('en-IN'); }
function escHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function genOrderId(){ return 'FL' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,5).toUpperCase(); }

/* ── Default catalogue ── */
const DEFAULT_PRODUCTS = [
  { id:'tomato',  name:'Desi Tomatoes', emoji:'🍅', category:'vegetable', price:15, unit:'kg', farm:'local Farms', badge:'organic', rating:4.8, reviews:214, desc:'Fresh juicy tomatoes.', image:'assets/images/tomato.jpg' },
  { id:'spinach', name:'Fresh Spinach',  emoji:'🥬', category:'vegetable', price:8,  unit:'bunch', farm:'local Farms', badge:'organic', rating:4.7, reviews:180, desc:'Fresh green spinach.', image:'assets/images/spinach.jpg' },
  { id:'carrot',  name:'Organic Carrots', emoji:'🥕', category:'vegetable', price:30, unit:'kg', farm:'local Farms', badge:'organic', rating:4.6, reviews:162, desc:'Crunchy organic carrots.', image:'assets/images/carrot.jpg' },
  { id:'brinjal', name:'Brinjal', emoji:'🍆', category:'vegetable', price:20, unit:'kg', farm:'local Farms', badge:null, rating:4.5, reviews:98, desc:'Fresh brinjals.', image:'assets/images/brinjal.jpg' },
  { id:'potato',  name:'Potato', emoji:'🥔', category:'vegetable', price:15, unit:'kg', farm:'local Farms', badge:null, rating:4.5, reviews:120, desc:'Farm potatoes.', image:'assets/images/potato.jpg' },
  { id:'capsicum', name:'Fresh Capsicum', emoji:'🫑', category:'vegetable', price:65, unit:'kg', farm:'local Farms', badge:'new', rating:4.7, reviews:80, desc:'Fresh capsicums.', image:'assets/images/capsicum.jpg' },
  { id:'cauliflower', name:'Fresh Cauliflower', emoji:'🥦', category:'vegetable', price:18, unit:'kg', farm:'local Farms', badge:null, rating:4.7, reviews:80, desc:'Fresh cauliflower.', image:'assets/images/cauliflower.jpg' },
  { id:'baby-potato', name:'Baby potato', emoji:'🥔', category:'vegetable', price:7, unit:'kg', farm:'local Farms', badge:null, rating:4.7, reviews:80, desc:'Fresh Baby Potatoes.', image:'assets/images/babypotato.jpg' },
  { id:'curry-leaves', name:'Fresh Curry leaves', emoji:'🌿', category:'vegetable', price:15, unit:'bunch', farm:'local Farms', badge:'organic', rating:4.7, reviews:80, desc:'Fresh curry leaves.', image:'assets/images/curryleaves.jpg' },
  { id:'red-onion', name:'Red Onion', emoji:'🧅', category:'vegetable', price:16, unit:'kg', farm:'local Farms', badge:null, rating:4.7, reviews:289, desc:'farm Red Onion.', image:'assets/images/redonion.jpg' },
  { id:'frozen-peas', name:'Frozen Peas', emoji:'🫛', category:'vegetable', price:80, unit:'kg', farm:'local Farms', badge:'organic', rating:4.6, reviews:134, desc:'Frozen Peas.', image:'assets/images/frozenpea.jpg' },
  { id:'karela', name:'Karela', emoji:'🥒', category:'vegetable', price:50, unit:'kg', farm:'local Farms', badge:null, rating:4.2, reviews:76, desc:'Karela.', image:'assets/images/karela.jpg' },
  { id:'drumstick', name:'Drumstick', emoji:'🌿', category:'vegetable', price:40, unit:'kg', farm:'local Farms', badge:'organic', rating:4.5, reviews:91, desc:'Drum Stick.', image:'assets/images/drumstick.jpg' },
  { id:'lady-finger', name:'Lady Finger', emoji:'🌱', category:'vegetable', price:50, unit:'kg', farm:'local Farms', badge:null, rating:4.7, reviews:183, desc:'Lady Finger.', image:'assets/images/ladyfinger.jpg' },
  { id:'bottle-gaurd', name:'Bottle gaurd', emoji:'🥦', category:'vegetable', price:8, unit:'kg', farm:'local Farms', badge:null, rating:4.4, reviews:102, desc:'Bottle gaurd.', image:'assets/images/bottlegurad.jpg' },
  { id:'methi', name:'Fresh Methi', emoji:'🌿', category:'vegetable', price:10, unit:'bunch', farm:'local Farms', badge:'organic', rating:4.6, reviews:147, desc:'Fresh Methi.', image:'assets/images/methi.jpg' },
  { id:'corn', name:'Corn', emoji:'🌽', category:'vegetable', price:20, unit:'kg', farm:'local Farms', badge:'new', rating:4.8, reviews:219, desc:'Corn.', image:'assets/images/corn.jpg' },
  { id:'radish', name:'Radish', emoji:'🌶', category:'vegetable', price:8, unit:'bunch', farm:'local Farms', badge:null, rating:4.4, reviews:62, desc:'Radish.', image:'assets/images/radish.jpg' },
  { id:'broccoli', name:'Broccoli', emoji:'🥦', category:'vegetable', price:60, unit:'kg', farm:'local Farms', badge:null, rating:4.7, reviews:80, desc:'Broccoli.', image:'assets/images/broccoli.jpg' },
  { id:'mushroom', name:'Fresh Mushroom', emoji:'🍄', category:'vegetable', price:50, unit:'250g box', farm:'local Farms', badge:null, rating:4.7, reviews:80, desc:'Fresh Mushroom.', image:'assets/images/mushroom.jpg' }
];
