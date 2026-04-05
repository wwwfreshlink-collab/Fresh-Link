# FreshLink

FreshLink is a static farm-to-home grocery website with a customer storefront and an admin console.

It is designed to run without a backend. Product data and cart data are stored in localStorage, and product catalog can optionally sync to Google Sheets.

## Highlights

- Static website (HTML/CSS/JavaScript), no server framework required
- Storefront pages for browsing, cart, checkout, and brand pages
- Admin console with product CRUD operations
- Optional Google Sheets sync (pull/push products)
- WhatsApp-based checkout flow for order placement
- Responsive UI for desktop and mobile

## Website Pages

- Customer pages (under `public/`):
  - `index.html` - Home + featured products
  - `shop.html` - Product listing, filter/sort/search, infinite scroll
  - `cart.html` - Cart management
  - `checkout.html` - Checkout form and WhatsApp order handoff
  - `how-it-works.html` - Process overview
  - `about.html` - Brand/about information
- Admin page:
  - `public/admin/index.html` - Login + dashboard + product management + sync settings

## Tech Stack

- HTML5
- CSS3 (custom variables and styles)
- Vanilla JavaScript
- Browser localStorage for persistence
- Optional Google Apps Script + Google Sheets integration

## Project Structure

```text
Fresh-Link/
  public/
    index.html
    shop.html
    cart.html
    checkout.html
    how-it-works.html
    about.html
    admin/
      index.html
    css/
      main.css
      variables.css
      admin.css
    js/
      config.js
      cart.js
      checkout.js
      shop.js
      ui.js
      gsheet.js
      admin.js
    assets/
      images/
  README.md
```

## Website Pages

All pages are located under `public/`:
- `index.html` - Home + featured products
- `shop.html` - Product listing, filter/sort/search, infinite scroll
- `cart.html` - Cart management
- `checkout.html` - Checkout form and WhatsApp order handoff
- `how-it-works.html` - Process overview
- `about.html` - Brand/about information
- `admin/index.html` - Login + dashboard + product management + sync settings

## Tech Stack

- HTML5
- CSS3 (custom variables and styles)
- Vanilla JavaScript
- Browser localStorage for persistence
- Optional Google Apps Script + Google Sheets integration

## Quick Start (Local)

You can run this as a static site with any local web server.

### Option 1: VS Code Live Server

1. Open this repository in VS Code.
2. Start Live Server from the project root.
3. Open:
   - `http://127.0.0.1:<port>/public/index.html`
   - Admin: `http://127.0.0.1:<port>/public/admin/index.html`

### Option 2: Python static server

Run in project root:

```powershell
python -m http.server 5500
```

Then open:

- `http://127.0.0.1:5500/public/index.html`
- `http://127.0.0.1:5500/public/admin/index.html`

## Core Configuration

Main constants live in `public/js/config.js`.

Key values:

- `STORE_NAME`
- `WHATSAPP_NUMBER`
- `UPI_ID`, `UPI_NAME`
- `FREE_DELIVERY_ABOVE`, `DELIVERY_CHARGE`, `DELIVERY_HOURS`
- `ADMIN_USER`, `ADMIN_PASS_HASH`
- `GSHEET_URL`

### Update admin credentials

Admin authentication compares:

- username: `ADMIN_USER`
- password hash: SHA-256 in `ADMIN_PASS_HASH`

To generate a SHA-256 hash in PowerShell:

```powershell
$pass = "your-new-password"
[Convert]::ToHexString(
  [System.Security.Cryptography.SHA256]::HashData(
    [Text.Encoding]::UTF8.GetBytes($pass)
  )
).ToLower()
```

Copy the resulting hash into `ADMIN_PASS_HASH`.

## Data Model

Products contain fields such as:

- `id`, `name`, `emoji`, `category`
- `price`, `discountPrice`, `unit`
- `farm`, `badge`, `rating`, `reviews`
- `desc`, `image`

Cart stores item references by product `id` with quantity.

## localStorage Keys

- `fl_products_v3` - product catalog
- `fl_cart_v1` - cart items
- `fl_orders_v1` - order records (if used in runtime flow)
- `fl_gsheet_url` - admin-saved Google Sheet URL override

## Google Sheets Integration (Optional)

FreshLink can use Google Sheets as a lightweight product database.

### 1. Create your sheet

Create a sheet named `Products` (or use first sheet) and add header row, for example:

`id, name, emoji, category, price, discountPrice, unit, farm, badge, rating, reviews, desc, image`

### 2. Add Apps Script

1. Open the sheet.
2. Go to Extensions > Apps Script.
3. Paste the `doGet` and `doPost` handlers documented in `js/gsheet.js`.
4. Deploy as Web App with public access as required by your setup.

### 3. Connect URL

Set `GSHEET_URL` in config, or use admin settings to save URL in localStorage.

### 4. Sync behavior

- Pull: load products from sheet when available
- Push: write admin updates back to sheet
- Fallback: localStorage/default catalog if sheet is unavailable

## Checkout Flow

Checkout is no-backend:

1. Customer fills contact and address fields.
2. Cart summary is converted into a formatted WhatsApp message.
3. User is redirected to `wa.me` using configured number.
4. Cart is cleared after order handoff.

## Deployment Notes

- Deploy as a static site (Netlify, Vercel static output, GitHub Pages, shared hosting, etc.).
- Ensure folder relationships are preserved (`public` with sibling `css`, `js`, `assets`).
- Set production values for WhatsApp number, UPI, admin credentials, and Sheet URL.

## Recommended Maintenance Workflow

- Keep root and `public/` duplicate assets synchronized when editing shared behavior.
- Test both customer flow and admin flow after changes.
- Validate product sync after changing `gsheet.js` or config constants.

## Known Constraints

- No backend/API security model; this is frontend-first architecture.
- Admin credentials are stored in client-side config hash.
- Data persistence depends on browser localStorage unless Sheets sync is enabled.

## License

No license file is currently included.
Add one if you plan public distribution.
