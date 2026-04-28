/**
 * CSV exporters for each marketplace's bulk-listing format.
 *
 * These mirror the canonical formats from sorting-hat/static/js/csv.js
 * (verified working on real seller imports). Two key facts that always
 * trip people up:
 *
 *   - TCGPlayer's mass-upload "TCGplayer Id" column is the SKU id
 *     (per product+condition+variant+language), NOT the product id.
 *     Without the matching SKU, every row imports as
 *     "does not match product details".
 *
 *   - Mana Pool's seller-import "product_id" is `products_mtg_single.id`
 *     (per-finish UUID), NOT the TCGPlayer product id.
 *
 * Both are looked up from collection-market-tracker-data via
 * tcgplayer-skus.json and manapool-skus.json respectively.
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
    if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

function rowsToCsv(headers, rows) {
    const lines = [headers.join(",")];
    for (const r of rows) lines.push(headers.map(h => csvEscape(r[h])).join(","));
    return lines.join("\r\n") + "\r\n";
}

function exportTcgPlayer(lines, deckLabel) {
    const headers = ["TCGplayer Id", "Condition", "Add to Quantity", "TCG Marketplace Price"];
    const rows = [];
    let missing = 0;
    for (const l of lines) {
        if (l.hidden || l.assigned !== "tcgplayer" || l.list == null) continue;
        const sku = l.tcgplayer_skus?.nm_normal;  // foil support deferred — needs per-card foil flag
        if (!sku) { missing++; continue; }
        rows.push({
            "TCGplayer Id":          sku,
            "Condition":             "Near Mint",
            "Add to Quantity":       l.quantity || 1,
            "TCG Marketplace Price": (l.list ?? 0).toFixed(2),
        });
    }
    if (!rows.length) return null;
    const csv = rowsToCsv(headers, rows);
    downloadCsv(`${deckLabel}_tcgplayer.csv`, csv);
    return rows.length + (missing ? ` (${missing} missing SKU)` : "");
}

function exportManaPool(lines, deckLabel) {
    const headers = [
        "product_type", "product_id", "name", "set", "number", "rarity",
        "language", "finish", "condition", "price",
        "market_low", "market_price", "market_price_foil",
        "quantity", "exported_at",
    ];
    const stamp = new Date().toISOString();
    const rows = [];
    let missing = 0;
    for (const l of lines) {
        if (l.hidden || l.assigned !== "manapool" || l.list == null) continue;
        const productId = l.manapool_skus?.nf;  // nonfoil default
        if (!productId) { missing++; continue; }
        rows.push({
            "product_type":       "mtg_single",
            "product_id":         productId,
            "name":               l.name,
            "set":                (l.set_code || "").toUpperCase(),
            "number":             l.card_number,
            "rarity":             l.rarity || "",
            "language":           "EN",
            "finish":             "NF",
            "condition":          "NM",
            "price":              (l.list ?? 0).toFixed(2),
            "market_low":         "",
            "market_price":       "",
            "market_price_foil":  "",
            "quantity":           l.quantity || 1,
            "exported_at":        stamp,
        });
    }
    if (!rows.length) return null;
    const csv = rowsToCsv(headers, rows);
    downloadCsv(`${deckLabel}_manapool.csv`, csv);
    return rows.length + (missing ? ` (${missing} missing SKU)` : "");
}

function exportEbay(lines, deckLabel) {
    /**
     * Minimal eBay listing worksheet. eBay's File Exchange has many
     * required fields (Action, Category, ConditionID, ListingType, etc.)
     * that need the seller's account-specific values, so we ship a
     * spreadsheet they can paste into File Exchange rather than guess.
     */
    const headers = ["Title", "Custom Label (SKU)", "Quantity", "Start Price", "Condition"];
    const rows = lines
        .filter(l => !l.hidden && l.assigned === "ebay" && l.list != null)
        .map(l => ({
            "Title":              `MTG ${l.set_code.toUpperCase()} #${l.card_number} ${l.name} NM`,
            "Custom Label (SKU)": `${l.set_code}-${l.card_number}`,
            "Quantity":           l.quantity || 1,
            "Start Price":        (l.list ?? 0).toFixed(2),
            "Condition":          "Near Mint",
        }));
    if (!rows.length) return null;
    const csv = rowsToCsv(headers, rows);
    downloadCsv(`${deckLabel}_ebay.csv`, csv);
    return rows.length;
}

function exportPlan(plan, deckLabel) {
    const summary = [];
    const tcg = exportTcgPlayer(plan.lines, deckLabel);
    if (tcg) summary.push(`TCGPlayer: ${tcg}`);
    const mp = exportManaPool(plan.lines, deckLabel);
    if (mp) summary.push(`ManaPool: ${mp}`);
    const eb = exportEbay(plan.lines, deckLabel);
    if (eb) summary.push(`eBay: ${eb}`);

    if (summary.length) return summary.join(" · ");

    // Diagnose: nothing exported. Why?
    const assigned = plan.lines.filter(l => !l.hidden && l.assigned);
    if (!assigned.length) return "Nothing assigned to a platform — check pricing rules / filters.";
    const tcgAssigned = assigned.filter(l => l.assigned === "tcgplayer");
    const mpAssigned = assigned.filter(l => l.assigned === "manapool");
    const tcgMissing = tcgAssigned.filter(l => !l.tcgplayer_skus?.nm_normal).length;
    const mpMissing = mpAssigned.filter(l => !l.manapool_skus?.nf).length;
    const reasons = [];
    if (tcgMissing) reasons.push(`${tcgMissing} TCG cards missing SKU id`);
    if (mpMissing) reasons.push(`${mpMissing} MP cards missing product id`);
    if (reasons.length) return `Nothing to export: ${reasons.join(", ")}. Hard-refresh (Ctrl+Shift+R) to pick up fresh SKU data.`;
    return "Nothing to export.";
}
