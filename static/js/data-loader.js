/**
 * Loads JSON data from GitHub Raw first, falls back to GCS
 */
async function loadJsonData(filename) {
    const githubRepo = "FutureGadgetCollections/collection-market-tracker-data";
    const gcsBucket = "collection-tracker-data";

    const githubUrl = `https://raw.githubusercontent.com/${githubRepo}/main/data/${filename}.json`;
    const gcsUrl = `https://storage.googleapis.com/${gcsBucket}/data/${filename}.json`;

    try {
        const response = await fetch(githubUrl);
        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.warn(`GitHub fetch failed for ${filename}, trying GCS...`);
    }

    try {
        const response = await fetch(gcsUrl);
        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.error(`Failed to load ${filename} from both sources`);
    }

    return null;
}

/**
 * Load all Secrets of Strixhaven commander decks
 */
async function loadDecks() {
    try {
        const sealedProducts = await loadJsonData("sealed-products");
        if (!sealedProducts) {
            console.error("Failed to load sealed products data");
            return [];
        }

        // Filter for Secrets of Strixhaven commander decks (mtg, soc, commander-deck-*)
        const decks = sealedProducts.filter(p =>
            p.game === "mtg" &&
            p.set_code === "soc" &&
            p.product_type && p.product_type.startsWith("commander-deck-")
        );

        // Map to friendly format
        return decks.map(deck => ({
            id: deck.product_type,
            name: deck.name || formatDeckName(deck.product_type),
            price: deck.msrp || 44.99,
            set_code: deck.set_code,
            product_type: deck.product_type,
            tcgplayer_id: deck.tcgplayer_id,
            msrp: deck.msrp,
            era: deck.era
        }));
    } catch (error) {
        console.error("Error loading decks:", error);
        return [];
    }
}

/**
 * Format deck product type to friendly name
 */
function formatDeckName(productType) {
    // Extract name from "commander-deck-{name}" format
    const match = productType.match(/commander-deck-(.+)/);
    if (match) {
        return "Secrets of Strixhaven Commander Deck - " +
            match[1].split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    return productType;
}

/**
 * Load cards for a specific deck
 */
async function loadDeckCards(deckProductType) {
    try {
        const singleCards = await loadJsonData("single-cards");
        if (!singleCards) {
            console.error("Failed to load single cards data");
            return [];
        }

        // Get all cards in the SOC set
        const socCards = singleCards.filter(c =>
            c.game === "mtg" &&
            c.set_code === "soc"
        );

        // Note: In a real implementation, you'd have deck lists stored separately
        // For now, return cards that would be in the deck
        return socCards.slice(0, 100);
    } catch (error) {
        console.error("Error loading deck cards:", error);
        return [];
    }
}

/**
 * Load platform pricing data
 */
async function loadPlatformPrices() {
    try {
        // Try to load TCGPlayer latest prices
        const tcgprices = await loadJsonData("tcgplayer-latest-prices");
        const manaprices = await loadJsonData("manapool-latest-prices");

        return {
            tcgplayer: tcgprices || {},
            manapool: manaprices || {},
            ebay: {} // Would need separate scraping
        };
    } catch (error) {
        console.error("Error loading platform prices:", error);
        return {};
    }
}
