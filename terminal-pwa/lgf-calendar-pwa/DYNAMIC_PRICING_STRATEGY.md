# Dynamic Pricing & Revenue Manager Module

## Implementation Plan for Existing PWA

### Project Goal

Add a complete Revenue Management module to the existing PWA that integrates with the existing MotoPress API and custom WordPress plugin.

The system should:

- Suggest prices intelligently using configurable rules.
- Optionally apply prices automatically.
- Allow manual approval.
- Display explanations for every price change.
- Promote discounts to customers using configurable website banners.
- Be modular so additional pricing logic can be added later.

---

# Design Principles

1. Every automatic decision must be explainable.
2. Nothing should overwrite prices without an audit log.
3. Every feature should be optional.
4. Configurable business rules over hardcoded logic.
5. Collect historical data to improve rules over time.

---

# MotoPress Integration

The pricing module needs to read and write room prices via MotoPress.

### Reading Prices

MotoPress stores room rates in `mphb_room_type` (CPT) and seasonal pricing in `mphb_season` (CPT). The existing plugin already exposes room data — the pricing calendar can query current rates by room type + date via custom REST endpoints added to the plugin.

### Writing Prices

MotoPress seasonal pricing works as date ranges on `mphb_season` posts. To apply a price change the system must:

1. Create a new `mphb_season` post with `start_date`, `end_date`, and `price`.
2. Or update an existing season whose date range matches.
3. Handle overlapping seasons — MotoPress uses first-match, so priority matters.

### Sync Strategy

- Prices are written to MotoPress via `wp_insert_post()` / `wp_update_post()` from the WordPress plugin's REST handlers.
- A cron job (or manual trigger) can rebuild a season calendar for a given room type for the next 12 months, merging all active rules.
- The pricing engine runs server-side only — the PWA never writes to MotoPress directly.

---

# Module Structure

## 1. Dashboard

Display:

- Occupancy Today
- Occupancy This Week
- Occupancy This Month
- Revenue
- Average Daily Rate (ADR)
- RevPAR
- Upcoming Arrivals
- Upcoming Departures
- Rooms requiring attention

### Charts

- Occupancy over time
- Revenue over time
- Average room price
- Booking lead time
- Booking source breakdown

---

## 2. Pricing Calendar

A calendar view similar to Booking.com.

Each room/date displays:

- Current Price
- Suggested Price
- Difference

### Colour coding

- 🟢 Green = Higher than current
- 🔴 Red = Lower than current
- ⚪ Grey = Unchanged

Clicking a date opens a side panel containing:

- Current price
- Suggested price
- Rule explanations
- Historical price
- Historical occupancy
- Apply button
- Reject button
- Notes

---

## 3. Pricing Engine

Pricing is calculated in stages.

```text
Base Room Price
        ↓
Season
        ↓
Weekend Adjustment
        ↓
Holiday Adjustment
        ↓
Occupancy Adjustment
        ↓
Lead Time Adjustment
        ↓
Local Event Adjustment
        ↓
Minimum / Maximum Price
        ↓
Rounded Price
        ↓
Suggested Price
```

Each rule returns:

- New price
- Reason
- Confidence

Every adjustment is stored.

### Example

```
Base price: €95

Weekend:     +10%
Occupancy:   +5%
Festival:    +15%

Rounded:     €120
```

Reasons:

- Saturday
- House occupancy 80%
- Wine Festival
- Rounded to nearest €5

---

## 4. Rules Management

Rules should be editable without code.

### Pricing Rules

- Base price
- Minimum price
- Maximum price
- Weekend multiplier
- Friday multiplier
- Saturday multiplier
- Sunday multiplier
- Weekday multiplier

### Occupancy thresholds

| Occupancy | Adjustment |
|-----------|-----------:|
| 0–25% | -15% |
| 25–50% | 0% |
| 50–75% | +10% |
| 75–90% | +20% |
| 90–100% | +35% |

### Lead Time Rules

| Days Before Arrival | Adjustment |
|--------------------|-----------|
| >90 | Early booking discount |
| 60–90 | Small discount |
| 30–60 | Normal |
| 14–30 | Small increase |
| 7–14 | Increase |
| 0–7 | Last-minute discount (optional) |

---

## 5. Season Manager

Manage named seasons with date ranges and base price overrides.

### Fields

- Season Name (e.g. "Peak Summer", "Low Season")
- Start Date
- End Date
- Base Price Override (or multiplier)
- Priority (for overlapping seasons)
- Active / Inactive toggle

### How it works

When the pricing engine runs, it looks up which season covers a given date. If a season overrides the base price, that becomes the starting point for all subsequent adjustments.

Recurring seasons should be supported — e.g. "Every year 1 July – 31 August" with a yearly recurrence flag. A yearly rebuild job creates individual date ranges for the next 12 months.

---

## 6. Local Events Manager

A dedicated section for local events.

### Fields

- Event Name
- Description
- Start Date
- End Date
- Radius (optional)
- Expected Demand
- Price Adjustment
- Priority
- Banner Enabled
- Recurring (yearly)

### Examples

- Wine Festival
- Village Market
- Cycling Race
- Wedding Weekend
- School Holidays
- Christmas Market
- Music Festival

Each event can:

- Increase prices
- Decrease prices
- Trigger promotional banners
- Be enabled/disabled

Recurring yearly events should also be supported.

---

## 7. Promotional Banner Manager

### Purpose

Show banners on the website whenever discounts or promotions are active.

### Banner Types

- Percentage discount
- Fixed discount
- Free breakfast
- Stay X nights, get Y free
- Seasonal promotion

### Fields

- Title
- Subtitle
- Button text
- Button URL
- Start date
- End date
- Background colour
- Image
- Rooms affected
- Languages

Languages:

- English
- French
- Dutch (future)

### Banner Display Rules

Show only if:

- Discount exists
- Specific event is active
- Specific season
- Minimum stay
- Booking window
- Specific room
- Specific language

The custom WordPress plugin should expose an endpoint so the website can fetch the currently active banner(s).

---

## 8. Promotion Engine

Automatically create promotional banners based on occupancy thresholds or events.

### Example 1

```
Occupancy next weekend < 30%
        ↓
Enable:
  "Last Minute Weekend Escape"
  15% OFF — Until Thursday
```

### Example 2

```
Wine Festival active
        ↓
Display:
  "Book now for the Wine Festival"
```

Manual editing should still be possible.

---

## 9. Price Approval Workflow

Three operating modes:

### Manual

Suggested prices only.

### Semi-Automatic

Apply suggestions unless rejected.

### Fully Automatic

Apply immediately.

Every action must be logged. Guardrails: always respect minimum/maximum price caps. Fully Automatic mode should have a dry-run period where actions are logged but not applied, to build confidence before going live.

---

## 10. Audit Log

Every price change records:

- Timestamp
- User
- Old price
- New price
- Reason
- Rules triggered
- Automatic or manual

Undo should always be possible.

---

## 11. Analytics

Track:

- Booking conversion
- Price acceptance
- Occupancy
- Revenue
- Discount effectiveness
- Promotion effectiveness
- Average lead time
- Average stay
- Cancellation rate

Graphs comparing:

- Current year
- Previous year
- Rolling 12 months

---

## 12. Data Collection

Store daily snapshots.

- Room
- Date
- Price
- Suggested price
- Occupancy
- Bookings
- Lead time
- Booking source
- Nationality
- Number of guests
- Length of stay
- Promotion
- Event
- Local events
- Cancellation status

This data improves rule accuracy over time.

---

# API Requirements

Reuse the existing MotoPress integration whenever possible.

Suggested endpoints (registered in the WordPress plugin):

```
GET    /pricing/calendar
GET    /pricing/rules
POST   /pricing/rules

GET    /pricing/suggestions
POST   /pricing/apply
POST   /pricing/reject

GET    /pricing/seasons
POST   /pricing/seasons

GET    /pricing/events
POST   /pricing/events

GET    /pricing/promotions
POST   /pricing/promotions

GET    /pricing/audit
GET    /pricing/analytics

GET    /website/banner

POST   /pricing/rebuild-seasons   (rebuild MotoPress seasons from rules)
```

The website banner endpoint should be lightweight and cache-friendly.

---

# Database Tables

```
pricing_rules
pricing_rule_history
pricing_suggestions
pricing_audit

pricing_seasons

local_events

promotional_banners
promotion_history

daily_metrics
pricing_snapshots
```

### Table Notes

- `pricing_seasons` — stores named season date ranges with base price overrides and priority. A yearly rebuild job expands recurring seasons into concrete date ranges in MotoPress.
- `pricing_snapshots` — stores one row per room per date per day, used by analytics.
- `daily_metrics` — aggregated daily totals (ADR, RevPAR, occupancy %).

---

# Development Phases

## Phase 1 — UI Scaffolding

- Pricing calendar (read-only, showing current prices per room/date)
- Season manager (CRUD for season date ranges)
- Local events manager (CRUD)
- Rules storage (CRUD, no pricing logic yet)
- Audit log (records changes only)
- Database schema and migration

Goal: end-to-end UI visible and usable, no automatic pricing yet.

---

## Phase 2 — Pricing Engine

- Rules engine: apply pricing pipeline (season → weekend → occupancy → lead time → events → min/max → rounding)
- Manual apply: user reviews suggestions and applies per-date
- Season → MotoPress sync: rebuild seasons from rules
- Price approval workflow (Manual + Semi-Automatic modes)
- Audit log integration (every suggestion logged)

Goal: prices are suggested based on rules and can be applied manually.

---

## Phase 3 — Local Events & Seasons

- Event-driven pricing adjustments (events from Phase 1 now wired into engine)
- Recurring event support
- Holiday pricing rules
- Season manager fully integrated with pricing calendar

---

## Phase 4 — Promotions & Banners

- Promotion engine (auto-generate banners from occupancy thresholds or events)
- Website banner endpoint (`GET /website/banner`)
- Banner manager with multi-language support
- Discount campaigns (percentage, fixed, stay X get Y)

---

## Phase 5 — Analytics & Auto-Apply

- Analytics dashboard (ADR, RevPAR, conversion, revenue graphs)
- Historical reporting (current year vs previous year vs rolling 12 months)
- Data collection: daily snapshots
- Fully Automatic approval mode (with dry-run period)
- Season rebuild automation (recurring cron)

---

# Long-Term Vision

The PWA becomes the central operating system for the property.

Instead of simply being a dashboard, it evolves into an integrated Property Management Companion that combines:

- Booking management
- Revenue management
- Dynamic pricing
- Promotions
- Website content
- Local events
- Analytics
- Guest insights

Every pricing decision should remain transparent, reversible, and fully explainable. The system should favour configurable business rules over opaque algorithms while collecting the historical data needed to continuously refine revenue performance.
