/**
 * Deck Selector and CSV Export Logic
 */

let selectedDeck = null;
let deckData = null;
let platformPrices = {};

document.addEventListener("DOMContentLoaded", async () => {
    await initializeDeckSelector();
});

async function initializeDeckSelector() {
    const spinner = document.getElementById("loadingSpinner");
    spinner.style.display = "block";

    try {
        // Load platform prices in background
        platformPrices = await loadPlatformPrices();

        const decks = await loadDecks();
        spinner.style.display = "none";

        if (decks.length === 0) {
            document.getElementById("deckGrid").innerHTML =
                '<div class="alert alert-warning">No decks found</div>';
            return;
        }

        const deckGrid = document.getElementById("deckGrid");
        deckGrid.innerHTML = "";

        decks.forEach(deck => {
            const col = document.createElement("div");
            col.className = "col-md-6 col-lg-4 mb-3";
            col.innerHTML = `
                <div class="card h-100 deck-card" style="cursor: pointer;" data-deck-id="${deck.id}">
                    <div class="card-body">
                        <h6 class="card-title">${extractDeckName(deck.name)}</h6>
                        <p class="card-text small text-muted">
                            <strong>MSRP:</strong> $${deck.price?.toFixed(2) || "N/A"}<br>
                            <strong>Set:</strong> ${deck.set_code?.toUpperCase() || "N/A"}
                        </p>
                    </div>
                </div>
            `;
            col.addEventListener("click", () => selectDeck(deck));
            deckGrid.appendChild(col);
        });
    } catch (error) {
        spinner.style.display = "none";
        document.getElementById("deckGrid").innerHTML =
            '<div class="alert alert-danger">Error loading decks: ' + error.message + '</div>';
    }
}

function extractDeckName(fullName) {
    // Extract just the deck name from "Secrets of Strixhaven Commander Deck - {Name}"
    const match = fullName?.match(/- (.+)$/);
    return match ? match[1] : fullName;
}

function selectDeck(deck) {
    selectedDeck = deck;

    // Highlight selected deck
    document.querySelectorAll(".deck-card").forEach(card => {
        card.classList.remove("border", "border-success", "border-3");
    });
    document.querySelector(`[data-deck-id="${deck.id}"]`)
        .classList.add("border", "border-success", "border-3");

    // Show export options
    document.getElementById("exportCard").style.display = "block";

    // Reset platform selection
    document.querySelectorAll(".platform-checkbox").forEach(cb => {
        cb.checked = cb.id === "platform-tcgplayer";
    });

    updateROIEstimate();
}

document.addEventListener("DOMContentLoaded", () => {
    const platformCheckboxes = document.querySelectorAll(".platform-checkbox");
    platformCheckboxes.forEach(checkbox => {
        checkbox.addEventListener("change", updateROIEstimate);
    });

    document.getElementById("exportBtn").addEventListener("click", exportToCSV);
});

function updateROIEstimate() {
    if (!selectedDeck) return;

    const selected = Array.from(document.querySelectorAll(".platform-checkbox:checked"))
        .map(cb => cb.value);

    const roiResults = document.getElementById("roiResults");

    if (selected.length === 0) {
        roiResults.style.display = "none";
        return;
    }

    // Calculate ROI - simple estimate based on typical margins
    const deckCost = selectedDeck.msrp || selectedDeck.price || 44.99;
    const margins = calculateMargins(selected);
    const estimate = deckCost * margins.avgMargin;

    const profit = estimate - deckCost;
    const roi = ((profit / deckCost) * 100).toFixed(1);

    roiResults.innerHTML = `
        <strong>📊 ROI Estimate for:</strong> ${selected.join(", ").toUpperCase()}<br>
        <strong>Deck Cost:</strong> $${deckCost.toFixed(2)}<br>
        <strong>Est. Revenue:</strong> $${estimate.toFixed(2)}<br>
        <strong>Est. Profit:</strong> $${profit.toFixed(2)}<br>
        <strong>ROI:</strong> <span class="${roi > 0 ? 'text-success' : 'text-danger'}">${roi}%</span>
        <small class="d-block mt-2 text-muted">
            Note: These are rough estimates. Actual values depend on card-by-card pricing on each platform.
        </small>
    `;
    roiResults.style.display = "block";
}

function calculateMargins(platforms) {
    // Platform-specific margin estimates (based on market averages)
    const margins = {
        tcgplayer: 1.15,  // 15% overhead, ~85% recovery typical
        manapool: 1.10,   // 10% overhead, ~90% recovery
        ebay: 1.12,       // 12% overhead, ~88% recovery (includes eBay fees)
        mixed: 1.18       // Mixed optimization: 18% margin
    };

    let totalMargin = 0;
    platforms.forEach(p => {
        totalMargin += margins[p] || 1.0;
    });

    return {
        avgMargin: totalMargin / platforms.length,
        individual: platforms.map(p => ({ platform: p, margin: margins[p] }))
    };
}

function exportToCSV() {
    if (!selectedDeck) {
        alert("Please select a deck first!");
        return;
    }

    const platforms = Array.from(document.querySelectorAll(".platform-checkbox:checked"))
        .map(cb => cb.value);

    if (platforms.length === 0) {
        alert("Please select at least one platform!");
        return;
    }

    const deckName = extractDeckName(selectedDeck.name);

    // Create CSV header
    let csv = "Secrets of Strixhaven - " + deckName + " Export\n";
    csv += "Exported: " + new Date().toLocaleString() + "\n";
    csv += "Platforms: " + platforms.map(p => p.toUpperCase()).join(", ") + "\n";
    csv += "Deck Cost: $" + (selectedDeck.msrp || 44.99).toFixed(2) + "\n\n";

    // Add column headers
    csv += "Card Name,Quantity,Type,Estimated Price,Platforms\n";

    // Add sample cards (in real implementation, would use actual deck list)
    const sampleCards = [
        { name: "Zaffai, Master Crafter", qty: 1, type: "Creature - Elemental" },
        { name: "Cascade Bluffs", qty: 1, type: "Land - Mountain Island" },
        { name: "Thousand-Year Storm", qty: 1, type: "Enchantment" }
    ];

    sampleCards.forEach(card => {
        const estimatedPrice = (3.50).toFixed(2); // Placeholder
        csv += `"${card.name}",${card.qty},"${card.type}","$${estimatedPrice}","${platforms.join(";")}"\n`;
    });

    csv += "\n";

    // Add summary
    csv += "--- SUMMARY ---\n";
    csv += `Deck,${deckName}\n`;
    csv += `Estimated Revenue,"$" + (selectedDeck.msrp * 1.15).toFixed(2)\n`;
    csv += `Target Platforms,"${platforms.map(p => p.toUpperCase()).join(", ")}"\n`;

    // Download CSV
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `${deckName.replace(/\s+/g, "_")}_${platforms.join("-")}_${new Date().getTime()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
