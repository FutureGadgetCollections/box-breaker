/**
 * Deck Selector and CSV Export Logic
 */

let selectedDeck = null;
let deckData = null;

document.addEventListener("DOMContentLoaded", async () => {
    await initializeDeckSelector();
});

async function initializeDeckSelector() {
    const spinner = document.getElementById("loadingSpinner");
    spinner.style.display = "block";

    const decks = await loadDecks();
    spinner.style.display = "none";

    if (decks.length === 0) {
        alert("No decks found!");
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
                    <h6 class="card-title">${deck.name}</h6>
                    <p class="card-text small text-muted">
                        <strong>Deck Price:</strong> $${deck.price?.toFixed(2) || "N/A"}<br>
                        <strong>Cards:</strong> ${deck.card_count || "TBD"}
                    </p>
                </div>
            </div>
        `;
        col.addEventListener("click", () => selectDeck(deck));
        deckGrid.appendChild(col);
    });
}

function selectDeck(deck) {
    selectedDeck = deck;
    deckData = deck;

    // Highlight selected deck
    document.querySelectorAll(".deck-card").forEach(card => {
        card.classList.remove("border", "border-success", "border-3");
    });
    document.querySelector(`[data-deck-id="${deck.id}"]`).classList.add("border", "border-success", "border-3");

    // Show export options
    document.getElementById("exportCard").style.display = "block";
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

    // Calculate ROI based on selected platforms
    const estimate = calculateROI(selectedDeck, selected);

    roiResults.innerHTML = `
        <strong>Estimated ROI:</strong><br>
        Deck Cost: $${selectedDeck.price?.toFixed(2) || "N/A"}<br>
        Estimated Total: $${estimate.toFixed(2)}<br>
        ROI: ${(((estimate - (selectedDeck.price || 0)) / (selectedDeck.price || 1)) * 100).toFixed(1)}%
    `;
    roiResults.style.display = "block";
}

function calculateROI(deck, platforms) {
    // Placeholder: would calculate based on card prices on each platform
    // For now, return deck price as minimum
    let total = deck.price || 0;

    // Simple multiplier based on platforms (would be replaced with actual pricing logic)
    const platformMultipliers = {
        tcgplayer: 1.0,
        manapool: 1.05,
        ebay: 1.1,
        mixed: 1.15
    };

    if (platforms.includes("mixed")) {
        total *= platformMultipliers.mixed;
    } else {
        let maxMultiplier = 1.0;
        platforms.forEach(p => {
            maxMultiplier = Math.max(maxMultiplier, platformMultipliers[p] || 1.0);
        });
        total *= maxMultiplier;
    }

    return total;
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

    // Create CSV with deck cards
    let csv = "Card Name,Quantity,Price,Platform,Total\n";

    // Add cards from the deck
    if (selectedDeck.cards && Array.isArray(selectedDeck.cards)) {
        selectedDeck.cards.forEach(card => {
            const platforms_str = platforms.join(";");
            csv += `"${card.name}",${card.quantity || 1},${card.price || 0},${platforms_str},${(card.price || 0) * (card.quantity || 1)}\n`;
        });
    }

    // Add summary row
    csv += `\n"${selectedDeck.name} Total",1,${selectedDeck.price || 0},"${platforms.join(", '")}",${selectedDeck.price || 0}\n`;

    // Download CSV
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedDeck.name.replace(/\s+/g, "_")}_export_${platforms.join("-")}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}
