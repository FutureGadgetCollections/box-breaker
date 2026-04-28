/**
 * Platform fee model + per-card net calculation + mixed-mode optimizer.
 *
 * Fee numbers per the project's prior calibration; tweak in one place.
 */

const PLATFORMS = {
    tcgplayer: {
        label: "TCGPlayer",
        feePct: 0.1025 + 0.025,  // 10.25% commission + 2.5% payment processing
        perOrderFee: 0.30,        // amortized; we divide across cards in the same listing
    },
    manapool: {
        label: "ManaPool",
        feePct: 0.05,
        perOrderFee: 0,
    },
    ebay: {
        label: "eBay",
        feePct: 0.1325,           // ~13.25% final value
        perOrderFee: 0.30,
    },
};

const PLATFORM_KEYS = ["tcgplayer", "manapool", "ebay"];

/**
 * Net proceeds after fees for one card sold at `price` on `platform`.
 * Per-order fee amortization: assume the card is one of N in a single order;
 * we approximate by dividing the per-order fee by N. For a single deck
 * (~80 unique cards), this ends up ~$0.004 per card — negligible.
 */
function netForCard(price, platform, cardsInOrder = 80) {
    if (price == null || isNaN(price)) return null;
    const p = PLATFORMS[platform];
    if (!p) return price;
    const perCardOrderFee = (p.perOrderFee || 0) / Math.max(cardsInOrder, 1);
    const net = price * (1 - p.feePct) - perCardOrderFee;
    return Math.max(0, net);
}

/**
 * For a card with prices on each platform, pick the platform with the
 * highest net. Returns { platform, net, price } or null if no prices.
 *
 * `availability` lets callers restrict the set of platforms (e.g. eBay
 * disabled). `priceFallback`: if a platform's price is missing but it's
 * allowed, fall back to TCGPlayer market_price (for eBay where we have
 * no live scraper).
 */
function pickBestPlatform(card, availability = PLATFORM_KEYS, priceFallback = true) {
    let best = null;
    for (const k of availability) {
        let price = null;
        if (k === "tcgplayer") price = card.prices.tcgplayer;
        else if (k === "manapool") price = card.prices.manapool;
        else if (k === "ebay") {
            price = priceFallback ? (card.prices.tcgplayer ?? null) : null;
        }
        const net = netForCard(price, k);
        if (net == null) continue;
        if (!best || net > best.net) {
            best = { platform: k, net, price };
        }
    }
    return best;
}

/**
 * Given a list of resolved deck cards and a global mode, compute per-card
 * platform assignments + summary.
 *
 * mode: "tcgplayer" | "manapool" | "ebay" | "mixed"
 * overrides: { [cardKey]: platform }   (cardKey = `${set_code}|${card_number}`)
 */
function computePlan(cards, mode, overrides = {}) {
    const lines = [];
    let totalGross = 0, totalNet = 0;
    let cardsWithPrice = 0, cardsWithoutPrice = 0;

    for (const card of cards) {
        const key = `${card.set_code}|${card.card_number}`;
        const override = overrides[key];

        let assigned = null;
        let net = null;
        let price = null;

        if (override) {
            price = priceForPlatform(card, override);
            net = netForCard(price, override);
            assigned = override;
        } else if (mode === "mixed") {
            const best = pickBestPlatform(card);
            if (best) {
                assigned = best.platform;
                net = best.net;
                price = best.price;
            }
        } else {
            price = priceForPlatform(card, mode);
            net = netForCard(price, mode);
            assigned = mode;
        }

        if (net != null) {
            totalGross += (price || 0) * card.quantity;
            totalNet += net * card.quantity;
            cardsWithPrice++;
        } else {
            cardsWithoutPrice++;
        }

        lines.push({ ...card, assigned, price, net, override: !!override });
    }

    return { lines, totalGross, totalNet, cardsWithPrice, cardsWithoutPrice };
}

function priceForPlatform(card, platform) {
    if (platform === "tcgplayer") return card.prices.tcgplayer;
    if (platform === "manapool") return card.prices.manapool;
    if (platform === "ebay") return card.prices.tcgplayer; // fallback proxy
    return null;
}
