/**
 * Catalog hierarchy: Game -> Set -> Deck.
 *
 * Games and per-set commander images are config-driven. Adding a game
 * just means adding an entry here; adding a set means adding card data
 * to collection-market-tracker-data and a row to SET_DECK_COMMANDERS
 * if you want pretty deck thumbnails.
 *
 * Set icons resolve to Scryfall's stable SVG URL: svgs.scryfall.io/sets/<code>.svg
 * Deck thumbnails resolve via Scryfall's stable card image URL by
 * (set, collector_number) for that deck's commander.
 */

const GAMES = [
    {
        code: "mtg",
        name: "Magic: The Gathering",
        logo: "https://upload.wikimedia.org/wikipedia/en/c/c5/Magic_the_gathering-logo.svg",
        active: true,
    },
    { code: "pokemon",      name: "Pokémon",            logo: null, active: false },
    { code: "one-piece",    name: "One Piece",          logo: null, active: false },
    { code: "weiss-schwarz",name: "Weiss Schwarz",      logo: null, active: false },
    { code: "riftbound",    name: "Riftbound",          logo: null, active: false },
];

/**
 * Manual commander mapping per (set_code, deck slug) so we can show
 * commander art on the deck picker without hitting an extra API per
 * deck on initial load. Source: MTGJSON deck files.
 *
 * Image source = Scryfall: https://api.scryfall.com/cards/{set}/{cn}
 * Returns image_uris.art_crop. We use the deterministic public CDN
 * url pattern instead of a per-deck API call.
 */
const SET_DECK_COMMANDERS = {
    soc: {
        "commander-deck-lorehold-spirit":         { name: "Quintorius, History Chaser",   set: "soc", number: "7"  },
        "commander-deck-prismari-artistry":       { name: "Rootha, Mastering the Moment", set: "soc", number: "8"  },
        "commander-deck-quandrix-unlimited":      { name: "Zimone, Infinite Analyst",     set: "soc", number: "10" },
        "commander-deck-silverquill-influence":   { name: "Killian, Decisive Mentor",     set: "soc", number: "4"  },
        "commander-deck-witherbloom-pestilence":  { name: "Dina, Essence Brewer",         set: "soc", number: "1"  },
        "commander-deck-set-of-5":                { name: "All 5 commanders (combined)",  set: "soc", number: "1", isMeta: true },
    },
};

/**
 * Build the set list from sealed-products.json: any set that has at
 * least one commander-deck-* product type counts as a "set you can
 * break down". Set names from a small registry; release dates from
 * the sealed product rows.
 */
const SET_REGISTRY = {
    soc: { name: "Secrets of Strixhaven Commander" },
    blc: { name: "Bloomburrow Commander" },
    fic: { name: "Final Fantasy Commander" },
    tdc: { name: "Tarkir: Dragonstorm Commander" },
    eoc: { name: "Edge of Eternities Commander" },
};

function getGames() {
    return GAMES;
}

function getSetsForGame(gameCode) {
    if (!Cache.sealed) return [];
    const sets = new Map(); // set_code -> { code, name, release_date, deckCount }
    for (const p of Cache.sealed) {
        if (p.game !== gameCode) continue;
        if (!p.product_type || !p.product_type.startsWith("commander-deck-")) continue;
        if (p.product_type === "commander-deck-set-of-5") continue;
        const code = p.set_code;
        if (!sets.has(code)) {
            sets.set(code, {
                code,
                name: SET_REGISTRY[code]?.name || p.era || code.toUpperCase(),
                release_date: p.release_date,
                deckCount: 0,
            });
        }
        sets.get(code).deckCount += 1;
    }
    return Array.from(sets.values()).sort((a, b) =>
        (b.release_date || "").localeCompare(a.release_date || "")
    );
}

function getDecksForSet(gameCode, setCode) {
    /**
     * Returns commander decks for the set, with the "Set of 5" meta-deck
     * sorted last so it shows up as a distinct option after the singles.
     */
    const all = (Cache.sealed || []).filter(p =>
        p.game === gameCode &&
        p.set_code === setCode &&
        p.product_type &&
        p.product_type.startsWith("commander-deck-")
    );
    return all.sort((a, b) => {
        const aMeta = a.product_type === "commander-deck-set-of-5";
        const bMeta = b.product_type === "commander-deck-set-of-5";
        if (aMeta && !bMeta) return 1;
        if (bMeta && !aMeta) return -1;
        return (a.product_type || "").localeCompare(b.product_type || "");
    });
}

function setIconUrl(setCode) {
    return `https://svgs.scryfall.io/sets/${setCode}.svg`;
}

function commanderInfoForDeck(setCode, productType) {
    return SET_DECK_COMMANDERS[setCode]?.[productType] || null;
}

/**
 * Stable Scryfall card image URL given (set, collector_number).
 * Scryfall serves redirects via /cards/{set}/{cn}.png — but those
 * redirect through the API. Cleaner to embed the API call result;
 * we lazy-fetch on render.
 */
async function fetchCommanderArt(setCode, cn) {
    const url = `https://api.scryfall.com/cards/${setCode}/${cn}`;
    try {
        const r = await fetch(url);
        if (!r.ok) return null;
        const data = await r.json();
        return data.image_uris?.art_crop || data.image_uris?.normal || null;
    } catch (_) {
        return null;
    }
}
