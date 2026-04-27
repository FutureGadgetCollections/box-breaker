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

## Current Status

- [x] Repo structure created
- [x] Hugo theme scaffolding
- [x] Deck selector UI
- [x] CSV export logic
- [ ] Product data added to Market Tracker
- [ ] TCGPlayer pricing integration
- [ ] ROI optimization logic (placeholder)
- [ ] ManaPool/eBay platform support

## Next Steps

1. Scrape Secrets of Strixhaven deck lists from Scryfall
2. Add all decks + cards + sealed products to market tracker
3. Integrate platform pricing data
4. Test CSV export with real data
