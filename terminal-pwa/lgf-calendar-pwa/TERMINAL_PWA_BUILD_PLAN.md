# LGF Terminal PWA — Build Plan

## Overview

Replace the WordPress-embedded terminal web app (`terminal/index.php`) with a **standalone PWA** hosted as static files on the same domain. No WordPress boot. No themes. No plugins. Just a single HTML file calling the REST API directly.

---

## Phase 1 — Server-side fix

### `includes/rest.php:148`

The `ticket-checkout-status` endpoint references a non-existent permission callback:

```php
// CURRENT (broken — function doesn't exist):
'permission_callback' => 'simple_hotel_crm_rest_auth',

// FIX:
'permission_callback' => '__return_true',
```

The `action_id` is a random Square-generated string — unguessable. This is safe.

---

## Phase 2 — New files

Create `terminal-pwa/` directory in the plugin root (or repo root).

### Files to create

| File | Size | Purpose |
|------|------|---------|
| `terminal-pwa/index.html` | ~50KB | Single-file app: HTML + CSS + JS |
| `terminal-pwa/manifest.json` | <1KB | PWA manifest for home-screen install |
| `terminal-pwa/sw.js` | ~1KB | Service worker for offline caching |

---

## App Architecture

### Auth

- Uses **WordPress Application Passwords** (built-in since WP 5.6)
- On first load → login overlay (username + app password)
- Stores `btoa(username + ':' + password)` in `localStorage`
- Every API call sends `Authorization: Basic <token>`
- On 401 → clear token, show login again

**Why this works with existing backend:**
WordPress hooks `determine_current_user` on REST API requests. When a valid application password is sent via `Authorization: Basic`, WP authenticates the user. The existing `simple_hotel_crm_user_can_access()` calls `is_user_logged_in()` + `current_user_can('manage_options')`, which both work after application password auth.

### Screens

| Screen | Trigger | Content |
|--------|---------|---------|
| **Login** | No stored auth, or 401 response | Username / password form |
| **Terminal** | Auth valid | Date picker, booking cards, catalog grid, ticket panel |

### API Functions

```js
function apiGet(path) {
    return fetch(restBase + path, {
        headers: { 'Authorization': 'Basic ' + auth }
    }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
}

function apiPost(path, body) {
    return fetch(restBase + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic ' + auth },
        body: JSON.stringify(body)
    }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
}
```

No nonce refresh. No cookies. Just the auth header.

### UI Layout (same as current terminal)

```
+------------------------------------------------------------------+
| [LGF Orders]  [📅 date]  [⛶ fs]                    [user]      |  ← .header
+------------------------------------------------------------------+
| [Booking 1] [Booking 2] [Booking 3] ...                          |  ← .bookings-row (horiz scroll)
+------------------------------------------+-----------------------+
|                                          | Ticket for: Name      |  ← .ticket-header
| 🍽️ Dinner (12)                          | Room: [select ▼]      |
| +------+ +------+ +------+              |                       |
| | Beer | | Wine | | Coke |              | 🍺 Beer         ×2 10€|
| | 5.00€| | 6.00€| | 3.00€|              | 🍷 Wine         ×1  6€|
| +------+ +------+ +------+              |                       |
|                                          | Total: 16.00€        |
| 🥤 Other (5)                             | [💾 Save]  [💳 Pay]  |
| +------+ +------+                        +-----------------------+
| | Juice| | Water|
| +------+ +------+
+------------------------------------------+
```

### State Shape

```js
{
    date: "2026-05-23",
    bookings: [],
    catalog: [],
    roomsByBooking: {},
    activeBookingId: null,
    activeRoomId: null,
    bookingRooms: [],
    ticketItems: [],      // [{id, name, qty, price}]
    savedItems: [],
    roomNights: [],
    activeBooking: null,
    tempIdCounter: 0
}
```

### Payment Flow (unchanged from current app)

1. User clicks "Pay"
2. Save ticket first (POST `/ticket-save`)
3. Fetch room nights + saved items
4. Show modal with charge breakdown (checkboxes)
5. POST `/ticket-show-bill` → receives `action_id`
6. Poll `GET /ticket-checkout-status/{action_id}` every 2s (max 150 attempts)
7. On `completed` → success; on `canceled`/`failed` → error

### iOS 12 iPad Air Considerations

| Feature | iOS 12 Support | Notes |
|---------|---------------|-------|
| `fetch()` | ✅ iOS 10.3+ | |
| `Promise` | ✅ iOS 10.3+ | |
| `const`/`let` | ✅ iOS 10+ | |
| `Array.from()` | ✅ iOS 12 | |
| `localStorage` | ✅ | |
| `requestFullscreen` | ❌ | `webkitRequestFullscreen` works on iOS 12 |
| `100vh` | ⚠️ Buggy | Use `window.innerHeight` fix (already in current app) |
| Touch events | ✅ | Use `click` (not touch) — simpler, works fine |
| Font stack | ✅ | `-apple-system` works |

---

## Phase 3 — Deployment

The PWA must be served from **the same origin** as the API to avoid CORS.

### Recommended: WordPress root directory

Upload files to `lagrangefleurie.fr/terminal-pwa/` (a new directory at the WP root):

```
lagrangefleurie.fr/
├── index.php
├── wp-content/
├── wp-admin/
├── terminal-pwa/     ← NEW (upload via cPanel/SFTP)
│   ├── index.html
│   ├── manifest.json
│   └── sw.js
└── ...
```

URL: `https://lagrangefleurie.fr/terminal-pwa/`

The server's `try_files` directive serves it directly — WordPress never boots because no rewrite rule matches `^terminal-pwa/`.

### Alternative: GitHub Pages / Netlify

Would need CORS headers on the WordPress server (`Access-Control-Allow-Origin`). More complex. Only use if Option A isn't possible.

---

## Summary of Changes

| File | Action | What |
|------|--------|------|
| `includes/rest.php:148` | **Edit** | Fix broken `simple_hotel_crm_rest_auth` → `__return_true` |
| `terminal-pwa/index.html` | **Create** | Full terminal app, application password auth |
| `terminal-pwa/manifest.json` | **Create** | PWA home-screen manifest |
| `terminal-pwa/sw.js` | **Create** | Service worker for offline cache |
