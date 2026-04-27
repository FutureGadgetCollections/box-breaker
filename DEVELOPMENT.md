# Development & Deployment Guide

## Local Development

```bash
# Start Hugo dev server (auto-reloads)
hugo server

# Site runs at http://localhost:1313
```

## Features

### 1. Deck Selector
- Browse 5 Secrets of Strixhaven commander decks
- Click to select a deck
- Displays MSRP and set code

### 2. Platform Selection
Choose where to list the broken-down deck:
- **TCGPlayer**: Best reach, 15% overhead
- **ManaPool**: Faster sales, 10% overhead
- **eBay**: Wide audience, 12% overhead
- **Mixed**: Auto-optimize ROI across all platforms (18% margin)

### 3. ROI Estimation
Shows estimated:
- Deck cost (MSRP)
- Estimated revenue based on platform fees
- Profit margin
- ROI percentage

### 4. CSV Export
Downloads deck inventory in CSV format ready for bulk upload to chosen platform(s).
File includes:
- Card names and quantities
- Estimated prices
- Target platforms
- Summary with total revenue estimate

## Data Files

- **sealed-products.json**: Deck product definitions (MSRP, release date, etc.)
- **single-cards.json**: Individual card catalog (used for placeholder display)
- **tcgplayer-latest-prices.json**: TCGPlayer pricing (future integration)
- **manapool-latest-prices.json**: ManaPool pricing (future integration)

All data sources from: `FutureGadgetCollections/collection-market-tracker-data`

## Future Enhancements

### Phase 2: Real Data
- [ ] Load actual Secrets of Strixhaven deck lists (stored in market tracker)
- [ ] Fetch live card prices from TCGPlayer API
- [ ] Fetch ManaPool pricing
- [ ] Calculate per-card ROI and recommend best platform for each card
- [ ] Implement "Smart Mix" - auto-assign cards to best platform

### Phase 3: Monetization
- [ ] Subscription check middleware (Firebase Auth)
- [ ] Rate limits on CSV exports
- [ ] Bulk deck pack export for power users

### Phase 4: Analytics
- [ ] Track sales by platform
- [ ] Historical ROI per platform
- [ ] Deck popularity metrics
- [ ] Recommend new sets to break

## API Integration (Future)

When integrating platform APIs:

```javascript
// Example: Direct bulk upload to TCGPlayer
const bulkUpload = async (deckCards, platform) => {
    const formatted = formatForPlatform(deckCards, platform);
    return await uploadToPlatform(formatted, platform);
};
```

## Testing Locally

1. Start Hugo server: `hugo server`
2. Open http://localhost:1313
3. Select a deck (cards load from market tracker data)
4. Choose platform(s)
5. View ROI estimate
6. Click "Download CSV" to test export

The CSV should be named like: `Prismari_Artistry_tcgplayer_1704067200000.csv`

## Troubleshooting

**No decks loading:**
- Check browser console for errors
- Verify data-loader.js is fetching from GitHub Raw or GCS correctly
- Test with `loadJsonData("sealed-products")` in console

**ROI numbers seem off:**
- Current phase 1 uses estimated margins, not real prices
- Phase 2 will integrate real TCGPlayer pricing

**CSV export not working:**
- Check browser console for JavaScript errors
- Verify file download permissions in browser
