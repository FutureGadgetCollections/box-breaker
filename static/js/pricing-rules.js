/**
 * User-defined pricing rules. Applied per-card after market lookup,
 * before fee deduction.
 *
 * Rules pipeline:
 *   1. Pick a BASIS price per the `basis` setting.
 *   2. Multiply by (1 + markupPct).
 *   3. Clamp to [floor, ceiling].
 *   4. Round to nearest `roundTo`.
 *
 * Persisted to localStorage so the user keeps their config across reloads.
 */

const DEFAULT_RULES = {
    basis: "platform",  // "platform" | "max" | "min" | "tcg" | "mp"
    markupPct: 0,       // 0.05 = +5%
    floor: 0,           // USD; 0 disables
    ceiling: 0,         // USD; 0 disables
    roundTo: 0.01,      // 0.01 / 0.05 / 0.10 / 0.25 / 0.99
};

const RULES_KEY = "box-breaker.pricing-rules.v1";

const DEFAULT_FILTERS = {
    hideBulkBasics: true,    // hide common basic lands whose market is below `bulkThreshold`
    bulkThreshold: 0.25,     // dollars; lands below this are bulk
};
const FILTERS_KEY = "box-breaker.filters.v1";

function loadFilters() {
    try {
        const raw = localStorage.getItem(FILTERS_KEY);
        if (!raw) return { ...DEFAULT_FILTERS };
        return { ...DEFAULT_FILTERS, ...JSON.parse(raw) };
    } catch (_) { return { ...DEFAULT_FILTERS }; }
}
function saveFilters(f) {
    try { localStorage.setItem(FILTERS_KEY, JSON.stringify(f)); } catch (_) { }
}

const BASIC_LAND_NAMES = new Set([
    "plains", "island", "swamp", "mountain", "forest", "wastes",
    "snow-covered plains", "snow-covered island", "snow-covered swamp",
    "snow-covered mountain", "snow-covered forest", "snow-covered wastes",
]);

function isBasicLand(card) {
    const n = (card?.name || "").toLowerCase();
    return BASIC_LAND_NAMES.has(n);
}

function shouldHide(card, filters, rules) {
    /**
     * "Bulk" = a basic land whose best market price falls below the
     * higher of `bulkThreshold` and the configured pricing-rules floor.
     * Anything at or above the threshold sticks around because it
     * actually has resale value (foil, full-art alt, etc.).
     */
    if (!filters?.hideBulkBasics) return false;
    if (!isBasicLand(card)) return false;
    const maxMarket = Math.max(
        card.prices.tcgplayer ?? 0,
        card.prices.manapool ?? 0
    );
    const cutoff = Math.max(filters.bulkThreshold || 0, rules?.floor || 0);
    return maxMarket < cutoff;
}

function loadRules() {
    try {
        const raw = localStorage.getItem(RULES_KEY);
        if (!raw) return { ...DEFAULT_RULES };
        return { ...DEFAULT_RULES, ...JSON.parse(raw) };
    } catch (_) {
        return { ...DEFAULT_RULES };
    }
}

function saveRules(rules) {
    try { localStorage.setItem(RULES_KEY, JSON.stringify(rules)); } catch (_) { }
}

function applyRules(card, platform, rules) {
    /**
     * Returns the rule-applied list price, or null if no usable basis.
     */
    const platformPrice =
        platform === "tcgplayer" ? card.prices.tcgplayer
      : platform === "manapool"  ? card.prices.manapool
      : platform === "ebay"      ? card.prices.tcgplayer  // proxy
      : null;

    let basis = null;
    switch (rules.basis) {
        case "max": {
            const candidates = [card.prices.tcgplayer, card.prices.manapool].filter(v => v != null && !isNaN(v));
            basis = candidates.length ? Math.max(...candidates) : null;
            break;
        }
        case "min": {
            const candidates = [card.prices.tcgplayer, card.prices.manapool].filter(v => v != null && !isNaN(v));
            basis = candidates.length ? Math.min(...candidates) : null;
            break;
        }
        case "tcg":
            basis = card.prices.tcgplayer ?? null;
            break;
        case "mp":
            basis = card.prices.manapool ?? null;
            break;
        case "platform":
        default:
            basis = platformPrice;
    }

    if (basis == null || isNaN(basis)) return null;

    let price = basis * (1 + (rules.markupPct || 0));
    if (rules.floor   && rules.floor   > 0 && price < rules.floor)   price = rules.floor;
    if (rules.ceiling && rules.ceiling > 0 && price > rules.ceiling) price = rules.ceiling;

    const step = rules.roundTo || 0.01;
    price = Math.round(price / step) * step;

    return price;
}
