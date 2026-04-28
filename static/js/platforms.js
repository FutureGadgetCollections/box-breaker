/**
 * Platform fee model + per-card net calculation + mixed-mode optimizer.
 *
 * Listed prices come from `applyRules()` (pricing-rules.js); this module
 * just turns those listed prices into net proceeds via the fee table.
 */

const PLATFORMS = {
    tcgplayer: {
        label: "TCGPlayer",
        feePct: 0.1025 + 0.025,  // 10.25% commission + 2.5% payment processing
        perOrderFee: 0.30,
    },
    manapool: {
        label: "ManaPool",
        feePct: 0.05,
        perOrderFee: 0,
    },
    ebay: {
        label: "eBay",
        feePct: 0.1325,
        perOrderFee: 0.30,
    },
};

const PLATFORM_KEYS = ["tcgplayer", "manapool", "ebay"];

function netForPrice(price, platform, cardsInOrder = 80) {
    if (price == null || isNaN(price)) return null;
    const p = PLATFORMS[platform];
    if (!p) return price;
    const perCard = (p.perOrderFee || 0) / Math.max(cardsInOrder, 1);
    return Math.max(0, price * (1 - p.feePct) - perCard);
}

/**
 * For a card, choose the platform that yields the highest net proceeds
 * given the active pricing rules.
 */
function pickBestPlatform(card, rules) {
    let best = null;
    for (const k of PLATFORM_KEYS) {
        const list = applyRules(card, k, rules);
        const net = netForPrice(list, k);
        if (net == null) continue;
        if (!best || net > best.net) {
            best = { platform: k, list, net };
        }
    }
    return best;
}

/**
 * Build the per-card listing plan.
 */
function computePlan(cards, mode, overrides, rules, filters) {
    const lines = [];
    let totalGross = 0, totalNet = 0;
    let cardsWithPrice = 0, cardsWithoutPrice = 0;
    let hiddenCount = 0, hiddenCopies = 0;

    for (const card of cards) {
        const hidden = typeof shouldHide === "function" && shouldHide(card, filters, rules);
        if (hidden) {
            hiddenCount++;
            hiddenCopies += card.quantity || 1;
            lines.push({ ...card, assigned: null, list: null, net: null, override: false, hidden: true });
            continue;
        }
        const key = `${card.set_code}|${card.card_number}`;
        const override = overrides[key];

        let assigned = null, list = null, net = null;

        if (override) {
            assigned = override;
            list = applyRules(card, override, rules);
            net = netForPrice(list, override);
        } else if (mode === "mixed") {
            const best = pickBestPlatform(card, rules);
            if (best) { assigned = best.platform; list = best.list; net = best.net; }
        } else {
            assigned = mode;
            list = applyRules(card, mode, rules);
            net = netForPrice(list, mode);
        }

        const qty = card.quantity || 1;
        if (net != null) {
            totalGross += list * qty;
            totalNet += net * qty;
            cardsWithPrice += qty;
        } else {
            cardsWithoutPrice += qty;
        }

        lines.push({ ...card, assigned, list, net, override: !!override });
    }

    return { lines, totalGross, totalNet, cardsWithPrice, cardsWithoutPrice, hiddenCount, hiddenCopies };
}
