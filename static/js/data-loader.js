/**
 * Data loader for box-breaker.
 *
 * Source files (collection-market-tracker-data, GitHub Raw + GCS fallback):
 *   sealed-products.json         deck SKUs + MSRP + tcgplayer_id
 *   precon-deck-lists.json       deck -> (set_code, card_number, quantity)
 *   single-cards.json            (game,set_code,card_number) -> name, rarity, tcgplayer_id
 *   tcgplayer-latest-prices.json tcgplayer_id -> market_price, listed_median, sellers
 *   manapool-latest-prices.json  tcgplayer_id -> from_price (lowest listed)
 *   manapool-skus.json           tcgplayer_id -> per-finish Mana Pool SKU UUIDs
 */

const DATA_REPO = "FutureGadgetCollections/collection-market-tracker-data";
const GCS_BUCKET = "collection-tracker-data";

async function loadJsonData(filename) {
    const ghUrl = `https://raw.githubusercontent.com/${DATA_REPO}/main/data/${filename}.json`;
    const gcsUrl = `https://storage.googleapis.com/${GCS_BUCKET}/data/${filename}.json`;
    try {
        const r = await fetch(ghUrl);
        if (r.ok) return await r.json();
    } catch (_) { }
    try {
        const r = await fetch(gcsUrl);
        if (r.ok) return await r.json();
    } catch (_) { }
    console.error(`[data-loader] failed to load ${filename}`);
    return null;
}

const Cache = {
    sealed: null,
    deckLists: null,
    cards: null,
    cardsBySetNum: null,
    cardsByTcg: null,
    tcgPrices: null,
    mpPrices: null,
    mpSkus: null,
};

async function loadAll() {
    if (Cache.sealed) return Cache;
    const [sealed, deckLists, cards, tcg, mp, mpSkus] = await Promise.all([
        loadJsonData("sealed-products"),
        loadJsonData("precon-deck-lists"),
        loadJsonData("single-cards"),
        loadJsonData("tcgplayer-latest-prices"),
        loadJsonData("manapool-latest-prices"),
        loadJsonData("manapool-skus"),
    ]);

    Cache.sealed = sealed || [];
    Cache.deckLists = deckLists || [];
    Cache.cards = cards || [];

    Cache.cardsBySetNum = new Map();
    Cache.cardsByTcg = new Map();
    for (const c of Cache.cards) {
        if (c.game !== "mtg") continue;
        Cache.cardsBySetNum.set(`${c.set_code}|${c.card_number}`, c);
        if (c.tcgplayer_id) Cache.cardsByTcg.set(String(c.tcgplayer_id), c);
    }

    Cache.tcgPrices = new Map((tcg || []).map(p => [String(p.tcgplayer_id), p]));
    Cache.mpPrices = new Map((mp || []).map(p => [String(p.tcgplayer_id), p]));
    Cache.mpSkus = new Map((mpSkus || []).map(s => [String(s.tcgplayer_id), s]));

    return Cache;
}

function getSocDecks() {
    return (Cache.sealed || []).filter(p =>
        p.game === "mtg" &&
        p.set_code === "soc" &&
        p.product_type &&
        p.product_type.startsWith("commander-deck-") &&
        p.product_type !== "commander-deck-set-of-5"
    );
}

function getDeckCards(productType) {
    if (productType === "commander-deck-set-of-5") {
        return getCombinedSetOfFiveCards();
    }
    return getSingleDeckCards(productType);
}

function getCombinedSetOfFiveCards() {
    /**
     * Union of all 5 SOC commander decks, with quantities summed by
     * (set_code, card_number). Eliminates cross-deck duplicates that
     * would otherwise show up as the same card in multiple per-deck
     * CSVs (Sol Ring, Path of Ancestry, basic lands, etc.).
     */
    const decks = [
        "commander-deck-lorehold-spirit",
        "commander-deck-prismari-artistry",
        "commander-deck-quandrix-unlimited",
        "commander-deck-silverquill-influence",
        "commander-deck-witherbloom-pestilence",
    ];
    const merged = new Map();
    for (const deck of decks) {
        for (const card of getSingleDeckCards(deck)) {
            const key = `${card.set_code}|${card.card_number}`;
            if (merged.has(key)) {
                merged.get(key).quantity += card.quantity;
            } else {
                merged.set(key, { ...card });
            }
        }
    }
    return Array.from(merged.values());
}

function getSingleDeckCards(productType) {
    /**
     * Resolve a deck (by product_type) to its full card list, joined with
     * card metadata + per-platform pricing.
     *
     * The precon row's set_code is the card's PRINTING set (so SOS reprints
     * in SOC commander decks have set_code='sos'). Lookup is exact —
     * (set_code, card_number) -> single_cards.
     *
     * Returns: [{ set_code, card_number, name, rarity, quantity, tcgplayer_id,
     *             prices: { tcgplayer, manapool }, manapool_skus }]
     */
    const entries = (Cache.deckLists || []).filter(e =>
        e.game === "mtg" && e.product_type === productType
    );

    return entries.map(e => {
        const card = Cache.cardsBySetNum.get(`${e.set_code}|${e.card_number}`);
        if (!card) {
            return {
                set_code: e.set_code, card_number: e.card_number,
                name: `?? ${e.set_code}#${e.card_number}`, rarity: "",
                quantity: e.quantity, tcgplayer_id: null,
                prices: { tcgplayer: null, manapool: null },
                manapool_skus: null,
            };
        }
        const tcgId = card.tcgplayer_id ? String(card.tcgplayer_id) : null;
        const tcg = tcgId ? Cache.tcgPrices.get(tcgId) : null;
        const mp = tcgId ? Cache.mpPrices.get(tcgId) : null;
        const mpSku = tcgId ? Cache.mpSkus.get(tcgId) : null;
        return {
            set_code: card.set_code,
            card_number: card.card_number,
            name: card.name,
            rarity: card.rarity,
            quantity: e.quantity,
            tcgplayer_id: tcgId,
            prices: {
                tcgplayer: tcg ? (tcg.market_price ?? tcg.listed_median ?? null) : null,
                manapool: mp ? (mp.from_price ?? null) : null,
            },
            manapool_skus: mpSku ? {
                nf: mpSku.nf_product_id,
                fo: mpSku.fo_product_id,
                set: mpSku.set,
                number: mpSku.number,
                rarity: mpSku.rarity,
            } : null,
        };
    });
}
