/**
 * CSV exporters for each platform's bulk-listing format.
 *
 * Reference docs:
 *   TCGPlayer mass upload: TCGplayer ID, Quantity, Price (Near Mint, English, NF)
 *     https://tcgplayer.com/dashboard/seller/help (CSV import format)
 *   Mana Pool seller import: product_id, finish, quantity, price, condition,
 *     language. product_id = products_mtg_single.id (per-finish UUID).
 *   eBay listings: simplified — Title, SKU, Price, Quantity. eBay's File
 *     Exchange has many fields; we ship a minimal-viable CSV.
 */

function downloadCsv(filename, content) {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function csvEscape(v) {
    if (v == null) return "";
    const s = String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

function rowsToCsv(headers, rows) {
    const out = [headers.join(",")];
    for (const r of rows) out.push(headers.map(h => csvEscape(r[h])).join(","));
    return out.join("\r\n") + "\r\n";
}

function exportTcgPlayer(lines, deckLabel) {
    /**
     * TCGPlayer mass upload format. Documented columns vary; the common
     * minimum is: TCGplayer Id, Quantity, Add to Quantity, TCG Marketplace
     * Price. We include the price per-card so the seller can review.
     */
    const rows = lines
        .filter(l => l.assigned === "tcgplayer" && l.tcgplayer_id && l.list != null)
        .map(l => ({
            "TCGplayer Id": l.tcgplayer_id,
            "Product Line": "Magic",
            "Set Name": l.set_code.toUpperCase(),
            "Product Name": l.name,
            "Number": l.card_number,
            "Rarity": l.rarity || "",
            "Condition": "Near Mint",
            "Add to Quantity": l.quantity || 1,
            "TCG Marketplace Price": (l.list ?? 0).toFixed(2),
        }));
    if (!rows.length) return null;
    const csv = rowsToCsv(
        ["TCGplayer Id", "Product Line", "Set Name", "Product Name", "Number",
         "Rarity", "Condition", "Add to Quantity", "TCG Marketplace Price"],
        rows
    );
    downloadCsv(`${deckLabel}_tcgplayer.csv`, csv);
    return rows.length;
}

function exportManaPool(lines, deckLabel) {
    /**
     * Mana Pool seller import. product_id is products_mtg_single.id (NM/EN
     * per-finish UUID); we default to NF (nonfoil). FO support would
     * require a UI toggle per card.
     */
    const rows = lines
        .filter(l => l.assigned === "manapool" && l.manapool_skus?.nf && l.list != null)
        .map(l => ({
            "product_id": l.manapool_skus.nf,
            "finish": "NF",
            "quantity": l.quantity || 1,
            "price": (l.list ?? 0).toFixed(2),
            "condition": "NM",
            "language": "EN",
            "name": l.name,
        }));
    if (!rows.length) return null;
    const csv = rowsToCsv(
        ["product_id", "finish", "quantity", "price", "condition", "language", "name"],
        rows
    );
    downloadCsv(`${deckLabel}_manapool.csv`, csv);
    return rows.length;
}

function exportEbay(lines, deckLabel) {
    /**
     * Minimal eBay-friendly CSV. eBay's File Exchange has many required
     * fields (Action, Category, ConditionID, ListingType...) that need
     * the seller's account-specific values; rather than guess, ship a
     * worksheet they can paste into File Exchange.
     */
    const rows = lines
        .filter(l => l.assigned === "ebay" && l.list != null)
        .map(l => ({
            "Title": `MTG ${l.set_code.toUpperCase()} #${l.card_number} ${l.name} NM`,
            "Custom Label (SKU)": `${l.set_code}-${l.card_number}`,
            "Quantity": l.quantity || 1,
            "Start Price": (l.list ?? 0).toFixed(2),
            "Condition": "Near Mint",
        }));
    if (!rows.length) return null;
    const csv = rowsToCsv(
        ["Title", "Custom Label (SKU)", "Quantity", "Start Price", "Condition"],
        rows
    );
    downloadCsv(`${deckLabel}_ebay.csv`, csv);
    return rows.length;
}

function exportPlan(plan, deckLabel) {
    /**
     * Export one CSV per platform that has any assigned cards. Returns
     * a summary string.
     */
    const summary = [];
    const tcg = exportTcgPlayer(plan.lines, deckLabel);
    if (tcg) summary.push(`TCGPlayer: ${tcg} lines`);
    const mp = exportManaPool(plan.lines, deckLabel);
    if (mp) summary.push(`ManaPool: ${mp} lines`);
    const eb = exportEbay(plan.lines, deckLabel);
    if (eb) summary.push(`eBay: ${eb} lines`);
    return summary.length ? summary.join(" · ") : "Nothing to export";
}
