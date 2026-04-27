# Box Breaker

A tool to analyze and optimize ROI when breaking down sealed Magic: The Gathering products for resale.

## What It Does

Box Breaker helps you decide which marketplace(s) to sell individual cards from a sealed commander deck on:

1. **Select a deck** — Browse all 5 Secrets of Strixhaven commander decks
2. **Choose platforms** — List on TCGPlayer, ManaPool, eBay, or let the tool optimize
3. **Calculate ROI** — See estimated profit margins per platform
4. **Export CSV** — Bulk upload format ready for each marketplace

Currently focused on **Secrets of Strixhaven** commander decks, with room to add other sets.

## Quick Start

```bash
# Clone this repo
cd box-breaker

# Start development server
hugo server

# Open http://localhost:1313
```

## Overview

- **Frontend:** Hugo static site (with JavaScript for interactivity)
- **Data Source:** Collection Market Tracker (products database)
- **Export Format:** CSV (with future support for platform APIs)
- **Pricing:** Free for MVP; subscription tier planned for bulk features

## Features

### ✅ Phase 1 (Complete)
- [x] Browse 5 SOC commander decks
- [x] Select marketplace(s)
- [x] Estimate ROI per platform
- [x] Export deck inventory as CSV

### 📋 Phase 2 (Planned)
- [ ] Real card pricing from TCGPlayer/ManaPool APIs
- [ ] Deck comparison (which set breaks best?)
- [ ] Smart mix: auto-assign cards to best platform
- [ ] eBay pricing integration

### 🔐 Phase 3 (Future)
- [ ] Authentication & subscriptions
- [ ] Rate limiting on bulk exports
- [ ] Admin panel for adding new sets

## Data Format

Products stored in **collection-market-tracker-data/data/sealed-products.json**:

```json
{
  "game": "mtg",
  "set_code": "soc",
  "product_type": "commander-deck-prismari-artistry",
  "name": "Secrets of Strixhaven Commander Deck - Prismari Artistry",
  "msrp": 44.99,
  "era": "Commander: Secrets of Strixhaven",
  "release_date": "2024-11-08"
}
```

## Deployment

```bash
# Build static site
hugo

# Output goes to ./public/
# Deploy to: Cloud Run, Firebase Hosting, or any static host
```

## For Developers

See [DEVELOPMENT.md](DEVELOPMENT.md) for:
- Local development setup
- Testing the UI
- Integration points for pricing APIs
- Roadmap

## License

Same as FutureGadgetCollections parent org
