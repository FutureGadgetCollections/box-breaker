/**
 * Main UI: deck picker grid + deck detail view (in-place swap, no routing).
 */

const State = {
    decks: [],
    activeDeck: null,    // sealed-product row
    activeCards: [],     // resolved card list
    mode: "mixed",       // global platform mode
    overrides: {},       // { cardKey: platform }
};

document.addEventListener("DOMContentLoaded", async () => {
    showSpinner(true);
    try {
        await loadAll();
        State.decks = getSocDecks();
        renderDeckGrid();
    } catch (e) {
        console.error(e);
        document.getElementById("deckGrid").innerHTML =
            `<div class="alert alert-danger">Failed to load data: ${e.message}</div>`;
    } finally {
        showSpinner(false);
    }
});

function showSpinner(on) {
    const el = document.getElementById("loadingSpinner");
    if (el) el.style.display = on ? "block" : "none";
}

function deckLabel(deck) {
    if (!deck) return "";
    return deck.name || deck.product_type;
}

function deckShortName(deck) {
    const name = deckLabel(deck);
    const m = name.match(/Deck\s+(.+)$/i);
    return m ? m[1] : name;
}

function fmtUsd(n) {
    if (n == null || isNaN(n)) return "—";
    return `$${n.toFixed(2)}`;
}

// --- Deck grid ---------------------------------------------------------

function renderDeckGrid() {
    const grid = document.getElementById("deckGrid");
    grid.innerHTML = "";
    document.getElementById("deckDetail").style.display = "none";
    document.getElementById("deckPickerCard").style.display = "block";

    if (!State.decks.length) {
        grid.innerHTML = `<div class="alert alert-warning">No SOC decks loaded.</div>`;
        return;
    }

    for (const deck of State.decks) {
        const col = document.createElement("div");
        col.className = "col-md-6 col-lg-4 mb-3";
        col.innerHTML = `
            <div class="card h-100 deck-card" style="cursor:pointer">
                <div class="card-body">
                    <h6 class="card-title">${deckShortName(deck)}</h6>
                    <p class="card-text small text-muted mb-1">
                        <strong>MSRP:</strong> ${fmtUsd(deck.msrp)}<br>
                        <strong>Set:</strong> ${(deck.set_code || "").toUpperCase()}<br>
                        <strong>TCG ID:</strong> ${deck.tcgplayer_id || "—"}
                    </p>
                </div>
            </div>`;
        col.querySelector(".deck-card").addEventListener("click", () => openDeck(deck));
        grid.appendChild(col);
    }
}

// --- Deck detail -------------------------------------------------------

function openDeck(deck) {
    State.activeDeck = deck;
    State.activeCards = getDeckCards(deck.product_type);
    State.overrides = {};
    document.getElementById("deckPickerCard").style.display = "none";
    document.getElementById("deckDetail").style.display = "block";
    renderDeckDetail();
}

function renderDeckDetail() {
    const deck = State.activeDeck;
    const plan = computePlan(State.activeCards, State.mode, State.overrides);

    const root = document.getElementById("deckDetail");
    root.innerHTML = `
        <div class="card">
            <div class="card-header bg-success text-white d-flex justify-content-between align-items-center">
                <div>
                    <button id="backBtn" class="btn btn-sm btn-light me-2">← Decks</button>
                    <strong>${deckShortName(deck)}</strong>
                    <span class="text-light-emphasis small ms-2">
                        (${State.activeCards.reduce((a,c) => a + c.quantity, 0)} cards · MSRP ${fmtUsd(deck.msrp)})
                    </span>
                </div>
                <div class="btn-group btn-group-sm" role="group" aria-label="Mode">
                    ${["tcgplayer","manapool","ebay","mixed"].map(k => `
                        <input type="radio" class="btn-check" name="mode" id="mode-${k}" value="${k}" ${State.mode===k?"checked":""}>
                        <label class="btn btn-outline-light" for="mode-${k}">${labelForMode(k)}</label>
                    `).join("")}
                </div>
            </div>
            <div class="card-body">
                ${renderRoiSummary(plan, deck)}
                ${renderCardTable(plan)}
                <div class="mt-3 d-flex gap-2">
                    <button id="exportBtn" class="btn btn-success">Download CSV(s)</button>
                    <span id="exportSummary" class="align-self-center small text-muted"></span>
                </div>
            </div>
        </div>
    `;

    document.getElementById("backBtn").addEventListener("click", () => {
        State.activeDeck = null;
        State.activeCards = [];
        renderDeckGrid();
    });

    document.querySelectorAll('input[name="mode"]').forEach(r => {
        r.addEventListener("change", e => {
            State.mode = e.target.value;
            State.overrides = {};
            renderDeckDetail();
        });
    });

    document.querySelectorAll(".override-select").forEach(sel => {
        sel.addEventListener("change", e => {
            const key = e.target.dataset.key;
            const val = e.target.value;
            if (val === "auto") delete State.overrides[key];
            else State.overrides[key] = val;
            renderDeckDetail();
        });
    });

    document.getElementById("exportBtn").addEventListener("click", () => {
        const summary = exportPlan(plan, deckShortName(deck).replace(/\s+/g, "_"));
        document.getElementById("exportSummary").textContent = summary;
    });
}

function labelForMode(k) {
    return k === "mixed" ? "Mixed (best/card)"
         : k === "tcgplayer" ? "TCGPlayer"
         : k === "manapool" ? "ManaPool" : "eBay";
}

function renderRoiSummary(plan, deck) {
    const cost = deck.msrp || 0;
    const profit = plan.totalNet - cost;
    const roiPct = cost > 0 ? (profit / cost) * 100 : 0;
    const roiClass = profit >= 0 ? "text-success" : "text-danger";
    return `
        <div class="row text-center mb-3 g-2">
            <div class="col"><div class="border rounded py-2 small">
                <div class="text-muted">Sealed cost</div>
                <div class="fs-5">${fmtUsd(cost)}</div>
            </div></div>
            <div class="col"><div class="border rounded py-2 small">
                <div class="text-muted">Gross proceeds</div>
                <div class="fs-5">${fmtUsd(plan.totalGross)}</div>
            </div></div>
            <div class="col"><div class="border rounded py-2 small">
                <div class="text-muted">Net after fees</div>
                <div class="fs-5">${fmtUsd(plan.totalNet)}</div>
            </div></div>
            <div class="col"><div class="border rounded py-2 small">
                <div class="text-muted">Profit</div>
                <div class="fs-5 ${roiClass}">${fmtUsd(profit)} <small>(${roiPct.toFixed(1)}%)</small></div>
            </div></div>
            <div class="col"><div class="border rounded py-2 small">
                <div class="text-muted">Priced / Total</div>
                <div class="fs-5">${plan.cardsWithPrice} / ${plan.cardsWithPrice + plan.cardsWithoutPrice}</div>
            </div></div>
        </div>
    `;
}

function renderCardTable(plan) {
    const rows = plan.lines.map(line => {
        const key = `${line.set_code}|${line.card_number}`;
        const tcg = line.prices.tcgplayer;
        const mp = line.prices.manapool;
        const assigned = line.assigned;
        const isOverride = line.override;
        return `
            <tr>
                <td class="text-muted small">${line.set_code.toUpperCase()} #${line.card_number}</td>
                <td>${line.name} ${line.quantity > 1 ? `<span class="badge bg-secondary">x${line.quantity}</span>` : ""}</td>
                <td class="text-end ${assigned==='tcgplayer'?'fw-bold':''}">${fmtUsd(tcg)}</td>
                <td class="text-end ${assigned==='manapool'?'fw-bold':''}">${fmtUsd(mp)}</td>
                <td class="text-end ${assigned==='ebay'?'fw-bold':''}">${fmtUsd(tcg)}<sup>*</sup></td>
                <td class="text-end">${fmtUsd(line.net)}</td>
                <td>
                    <select class="form-select form-select-sm override-select" data-key="${key}">
                        <option value="auto" ${!isOverride?"selected":""}>Auto (${assigned||"—"})</option>
                        <option value="tcgplayer" ${assigned==='tcgplayer'&&isOverride?"selected":""}>TCGPlayer</option>
                        <option value="manapool" ${assigned==='manapool'&&isOverride?"selected":""}>ManaPool</option>
                        <option value="ebay" ${assigned==='ebay'&&isOverride?"selected":""}>eBay</option>
                    </select>
                </td>
            </tr>`;
    }).join("");

    return `
        <div class="table-responsive">
            <table class="table table-sm table-hover align-middle">
                <thead class="table-light">
                    <tr>
                        <th>Set/#</th>
                        <th>Card</th>
                        <th class="text-end">TCG</th>
                        <th class="text-end">MP</th>
                        <th class="text-end">eBay*</th>
                        <th class="text-end">Net</th>
                        <th>Platform</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            <small class="text-muted">*eBay uses TCGPlayer market price as a proxy until eBay scraping is wired up. Bold = chosen platform.</small>
        </div>
    `;
}
