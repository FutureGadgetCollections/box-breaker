/**
 * Real-time price refresh from the browser. Uses two CORS-friendly APIs:
 *
 *   - Scryfall `/cards/collection` (POST, batch up to 75) for TCGPlayer-
 *     equivalent USD prices. Note: Scryfall's USD reflects TCGPlayer
 *     market with daily refresh — not strictly intraday.
 *
 *   - Mana Pool Supabase `cardsmtg_browse?tcgplayerProductId=in.(...)`
 *     for the lowest current listed price. Truly live.
 *
 * For intraday TCGPlayer market, we'd need a backend proxy (their
 * mp-search-api blocks cross-origin browser requests).
 */

const SCRYFALL_BATCH = 75;

const MP_API = "https://sb-api.manapool.com/rest/v1";
const MP_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqY3N3eG91ZXRva3pnd2FhdmlzIiwicm9sZSI6" +
    "ImFub24iLCJpYXQiOjE2ODE4MjkzMDksImV4cCI6MTk5NzQwNTMwOX0." +
    "qnpA4iiwPuULAOBvFs38pK6U_2R5yuJAmTHInRx8Ijg";

async function fetchScryfallPrices(cards) {
    /**
     * Returns Map<tcgplayer_id, { usd, scryfall_id }>.
     * Identifies cards by (set, collector_number).
     */
    const out = new Map();
    for (let i = 0; i < cards.length; i += SCRYFALL_BATCH) {
        const batch = cards.slice(i, i + SCRYFALL_BATCH).map(c => ({
            set: c.set_code, collector_number: c.card_number,
        }));
        try {
            const resp = await fetch("https://api.scryfall.com/cards/collection", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifiers: batch }),
            });
            if (!resp.ok) continue;
            const data = await resp.json();
            for (const card of (data.data || [])) {
                const tcgId = card.tcgplayer_id ? String(card.tcgplayer_id) : null;
                const usd = card.prices?.usd ? parseFloat(card.prices.usd) : null;
                if (tcgId) out.set(tcgId, { usd, scryfall_id: card.id });
            }
        } catch (e) {
            console.warn("[refresh] Scryfall batch failed:", e);
        }
    }
    return out;
}

async function fetchManaPoolPrices(tcgplayerIds) {
    /**
     * Returns Map<tcgplayer_id, from_price (USD)>. Mana Pool stores
     * prices in cents on `cardsmtg_browse.from_price`, joined to
     * `cardsmtg.tcgplayerProductId`. Empty entries mean no listings.
     */
    const out = new Map();
    const ids = tcgplayerIds.filter(Boolean);
    const BATCH = 200;
    for (let i = 0; i < ids.length; i += BATCH) {
        const batch = ids.slice(i, i + BATCH).join(",");
        const url = new URL(`${MP_API}/cardsmtg_browse`);
        url.searchParams.set("select", "from_price,quantity,cardsmtg!inner(tcgplayerProductId)");
        url.searchParams.set("cardsmtg.tcgplayerProductId", `in.(${batch})`);
        try {
            const resp = await fetch(url, {
                headers: { apikey: MP_KEY, Authorization: `Bearer ${MP_KEY}` },
            });
            if (!resp.ok) continue;
            const data = await resp.json();
            for (const row of data) {
                const tid = String(row?.cardsmtg?.tcgplayerProductId ?? "");
                const cents = row.from_price;
                if (!tid || cents == null) continue;
                const usd = Math.round(cents) / 100;
                // Take the minimum if a tcg id appears multiple times (different printings)
                const existing = out.get(tid);
                if (existing == null || usd < existing) out.set(tid, usd);
            }
        } catch (e) {
            console.warn("[refresh] Mana Pool batch failed:", e);
        }
    }
    return out;
}

async function refreshDeckPrices(cards) {
    /**
     * Mutates `cards` in place with fresh prices from Scryfall (TCG)
     * and Mana Pool. Returns { updated: int, skipped: int }.
     */
    const tcgPrices = await fetchScryfallPrices(cards);
    const mpPrices = await fetchManaPoolPrices(
        cards.map(c => c.tcgplayer_id).filter(Boolean)
    );

    let updated = 0;
    for (const c of cards) {
        const tid = c.tcgplayer_id ? String(c.tcgplayer_id) : null;
        if (tid && tcgPrices.has(tid)) {
            const p = tcgPrices.get(tid);
            if (p.usd != null) { c.prices.tcgplayer = p.usd; updated++; }
        }
        if (tid && mpPrices.has(tid)) {
            c.prices.manapool = mpPrices.get(tid);
            updated++;
        }
    }
    return { updated, total: cards.length };
}
