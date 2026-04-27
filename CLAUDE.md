# Box Breaker

## Project Overview

Tool for analyzing ROI when breaking down sealed Magic: The Gathering commander products for resale. Select a deck, choose platforms (TCGPlayer, ManaPool, eBay, or mixed), and export a CSV optimized for maximum profit.

## Architecture

- **Framework:** Hugo static site with Bootstrap 5
- **Data Source:** Collection Market Tracker (`collection-market-tracker-data`)
- **Auth:** None (public tool)
- **Data reads:** Market Tracker products JSON

## Key Features

1. **Deck Selector:** Browse Secrets of Strixhaven commander decks
2. **Platform Selection:** Choose which marketplace(s) to list on
3. **ROI Calculator:** Estimates profit based on card prices per platform
4. **CSV Export:** Export deck with platform assignments for bulk listing

## Key Files

| Path | Purpose |
|------|---------|
| `hugo.toml` | Hugo config, data source params |
| `content/_index.md` | Main deck selector page |
| `static/js/data-loader.js` | Fetches deck data from Market Tracker |
| `static/js/deck-selector.js` | UI logic for selection and export |
| `themes/box-breaker/layouts/` | Hugo templates |

## Data Flow

```
Collection Market Tracker (BigQuery)
  └── Market Tracker Backend (data-sync job)
        ├──► collection-market-tracker-data (GitHub)
        └──► GCS bucket (fallback)

Box Breaker Frontend reads: GitHub first ► GCS fallback
```

## Current Status - Phase 1 Complete ✅

- [x] Repo structure created
- [x] Hugo theme scaffolding with Bootstrap 5
- [x] Deck selector UI (loads from market tracker)
- [x] CSV export logic
- [x] Product data added to Market Tracker (sealed-products, single-cards)
- [x] Basic ROI optimization logic
- [x] Platform selection UI (TCGPlayer, ManaPool, eBay, Mixed)

## Implementation Notes

**Data Structure:**
- Uses market tracker's sealed-products.json (game="mtg", set_code="soc")
- Filters for products with product_type starting with "commander-deck-"
- Single cards stored in single-cards.json with set_code="soc"

**Frontend Flow:**
1. Load sealed products from market tracker data
2. Display 5 SOC commander decks as selectable cards
3. User selects deck + platforms
4. Calculate estimated ROI based on platform margins
5. Export deck inventory as CSV for bulk listing

**ROI Calculation (Phase 1):**
- TCGPlayer: 1.15x (15% margin - typical fees)
- ManaPool: 1.10x (10% margin - lower fees)
- eBay: 1.12x (12% margin - eBay takes cut)
- Mixed: 1.18x (optimized across platforms)

## Phase 2 - Enhancement Tasks

- [ ] Actual deck lists (currently placeholder cards)
- [ ] Per-card platform pricing from TCGPlayer/ManaPool APIs
- [ ] Dynamic ROI calculation based on real card prices
- [ ] Deck comparison tool (which deck has best ROI?)
- [ ] eBay integration for pricing
- [ ] Admin UI to add new sealed sets
- [ ] Subscription tier check (paywall for bulk export)

## Deployment

Hugo static site served from Cloud Run or Firebase Hosting.
Reads data from collection-market-tracker-data GitHub repo (or GCS fallback).
