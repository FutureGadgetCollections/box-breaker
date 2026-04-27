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
        const products = await loadJsonData("products");
        if (!products) {
            console.error("Failed to load products data");
            return [];
        }

        // Filter for Secrets of Strixhaven commander decks
        const decks = products.filter(p =>
            p.set_code === "SOC" &&
            p.product_type === "Commander Deck"
        );

        return decks;
    } catch (error) {
        console.error("Error loading decks:", error);
        return [];
    }
}
