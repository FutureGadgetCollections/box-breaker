# Box Breaker

A tool to analyze and optimize ROI when breaking down sealed Magic: The Gathering products for resale.

## Overview

Box Breaker helps determine which platform(s) to list individual cards and sealed products on to maximize profit margins. Instead of guessing, users can:

1. Select a commander deck from Secrets of Strixhaven
2. Choose which platforms to list on (TCGPlayer, ManaPool, eBay, or mix)
3. Export a CSV with optimized platform assignments for each card

## Architecture

- **Frontend:** Hugo static site (with JavaScript for interactivity)
- **Data Source:** Collection Market Tracker products database
- **Data Format:** JSON (products with card lists and pricing)

## Development

```bash
# Build the site
hugo

# Serve locally
hugo server
```

## Data Requirements

The site expects products data with the following structure:

```json
{
  "id": "soc-prismari-artistry",
  "name": "Secrets of Strixhaven Commander Deck - Prismari Artistry",
  "set_code": "SOC",
  "product_type": "Commander Deck",
  "price": 45.99,
  "card_count": 100,
  "cards": [
    {
      "name": "Card Name",
      "quantity": 1,
      "price": 2.50,
      "tcgplayer_price": 2.50,
      "manapool_price": 2.40,
      "ebay_price": 3.00
    }
  ]
}
```

## Deployment

This site is deployed as a static Hugo site. Data is pulled from the Collection Market Tracker.
