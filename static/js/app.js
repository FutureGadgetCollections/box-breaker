/**
 * Main UI: navigates Game -> Set -> Deck -> Detail in-place.
 */

const State = {
    view: "game",          // "game" | "set" | "deck" | "detail"
    activeGame: null,      // game code (e.g. "mtg")
    activeSet: null,       // set code (e.g. "soc")
    activeDeck: null,      // sealed-product row
    activeCards: [],       // resolved deck cards
    mode: "mixed",         // global platform mode
    overrides: {},         // { cardKey: platform }
    rules: typeof loadRules === "function" ? loadRules() : { basis:"platform", markupPct:0, floor:0, ceiling:0, roundTo:0.01 },
    filters: typeof loadFilters === "function" ? loadFilters() : { hideBulkBasics: true, bulkThreshold: 0.25 },
    showRules: false,
    sort: [{ col: "card_number", dir: "asc" }],  // ordered list of sort keys; primary first. Shift+click adds secondary.
};

const RARITY_ORDER = { mythic: 0, rare: 1, uncommon: 2, common: 3, special: 4, bonus: 4, "basic land": 5 };
function rarityRank(r) {
    if (!r) return 99;
    const k = String(r).toLowerCase();
    return k in RARITY_ORDER ? RARITY_ORDER[k] : 50;
}

document.addEventListener("DOMContentLoaded", async () => {
    showSpinner(true);
    try {
        await loadAll();
        renderGameGrid();
    } catch (e) {
        console.error(e);
        document.getElementById("root").innerHTML =
            `<div class="alert alert-danger">Failed to load data: ${e.message}</div>`;
    } finally {
        showSpinner(false);
    }
});

function showSpinner(on) {
    const el = document.getElementById("loadingSpinner");
    if (el) el.style.display = on ? "block" : "none";
}

function fmtUsd(n) {
    if (n == null || isNaN(n)) return "—";
    return `$${n.toFixed(2)}`;
}

function breadcrumb() {
    const parts = [];
    parts.push(`<a href="#" data-nav="game" class="text-decoration-none">Games</a>`);
    if (State.activeGame) {
        const g = GAMES.find(x => x.code === State.activeGame);
        parts.push(`<a href="#" data-nav="set" class="text-decoration-none">${g?.name || State.activeGame}</a>`);
    }
    if (State.activeSet) {
        const s = getSetsForGame(State.activeGame).find(x => x.code === State.activeSet);
        parts.push(`<a href="#" data-nav="deck" class="text-decoration-none">${s?.name || State.activeSet.toUpperCase()}</a>`);
    }
    if (State.activeDeck) {
        parts.push(`<span class="text-muted">${deckShortName(State.activeDeck)}</span>`);
    }
    return `<nav class="mb-3 small text-muted">${parts.join(" <span class='mx-1'>›</span> ")}</nav>`;
}

function bindBreadcrumbNav() {
    document.querySelectorAll('[data-nav]').forEach(a => {
        a.addEventListener("click", e => {
            e.preventDefault();
            const target = e.target.dataset.nav;
            if (target === "game") { goToGame(); }
            else if (target === "set") { goToSets(); }
            else if (target === "deck") { goToDecks(); }
        });
    });
}

function goToGame() {
    State.activeGame = State.activeSet = State.activeDeck = null;
    State.activeCards = [];
    renderGameGrid();
}
function goToSets() {
    State.activeSet = State.activeDeck = null;
    State.activeCards = [];
    renderSetGrid();
}
function goToDecks() {
    State.activeDeck = null;
    State.activeCards = [];
    renderDeckGrid();
}

// --- Game picker -------------------------------------------------------

function renderGameGrid() {
    State.view = "game";
    const root = document.getElementById("root");
    const cards = GAMES.map(g => {
        const disabled = !g.active;
        return `
            <div class="col-md-4 col-lg-3 mb-3">
                <div class="card h-100 ${disabled ? 'opacity-50' : ''}" style="${disabled?'cursor:not-allowed':'cursor:pointer'}" data-game="${g.code}">
                    <div class="card-body text-center d-flex flex-column align-items-center justify-content-center" style="min-height:160px">
                        ${g.logo ? `<img src="${g.logo}" alt="${g.name}" style="max-height:80px;max-width:90%">` : `<h4 class="m-0">${g.name}</h4>`}
                        ${disabled ? '<small class="text-muted mt-2">Coming soon</small>' : ''}
                    </div>
                </div>
            </div>`;
    }).join("");

    root.innerHTML = `
        <div class="card">
            <div class="card-header bg-primary text-white"><h5 class="m-0">Pick a game</h5></div>
            <div class="card-body"><div class="row">${cards}</div></div>
        </div>`;

    document.querySelectorAll("[data-game]").forEach(el => {
        el.addEventListener("click", () => {
            const g = GAMES.find(x => x.code === el.dataset.game);
            if (!g || !g.active) return;
            State.activeGame = g.code;
            renderSetGrid();
        });
    });
}

// --- Set picker --------------------------------------------------------

function renderSetGrid() {
    State.view = "set";
    const root = document.getElementById("root");
    const sets = getSetsForGame(State.activeGame);
    const cards = sets.map(s => `
        <div class="col-md-6 col-lg-4 mb-3">
            <div class="card h-100" style="cursor:pointer" data-set="${s.code}">
                <div class="card-body text-center">
                    <img src="${setIconUrl(s.code)}" alt="${s.name}"
                         style="height:64px;width:64px;margin-bottom:.5rem"
                         onerror="this.style.display='none'">
                    <h6 class="card-title m-0">${s.name}</h6>
                    <small class="text-muted">${s.code.toUpperCase()} · ${s.release_date || ""}</small>
                    <div class="small mt-1">${s.deckCount} deck${s.deckCount===1?'':'s'}</div>
                </div>
            </div>
        </div>`).join("");

    root.innerHTML = `
        ${breadcrumb()}
        <div class="card">
            <div class="card-header bg-primary text-white"><h5 class="m-0">Pick a set</h5></div>
            <div class="card-body">
                ${sets.length ? `<div class="row">${cards}</div>` : '<div class="alert alert-warning">No sets with commander decks in catalog yet for this game.</div>'}
            </div>
        </div>`;
    bindBreadcrumbNav();

    document.querySelectorAll("[data-set]").forEach(el => {
        el.addEventListener("click", () => {
            State.activeSet = el.dataset.set;
            renderDeckGrid();
        });
    });
}

// --- Deck picker -------------------------------------------------------

function renderDeckGrid() {
    State.view = "deck";
    const root = document.getElementById("root");
    const decks = getDecksForSet(State.activeGame, State.activeSet);
    const setName = getSetsForGame(State.activeGame).find(s => s.code === State.activeSet)?.name || State.activeSet.toUpperCase();

    const cards = decks.map(d => {
        const cmd = commanderInfoForDeck(State.activeSet, d.product_type);
        const imgId = `cmd-${d.product_type}`;
        const isMeta = d.product_type === "commander-deck-set-of-5";
        return `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card h-100 ${isMeta ? 'border-warning border-2' : ''}" style="cursor:pointer" data-deck="${d.product_type}">
                    <div style="background:#222;height:180px;overflow:hidden;display:flex;align-items:center;justify-content:center;${isMeta?'background:linear-gradient(135deg,#7e57c2,#26a69a)':''}">
                        ${isMeta
                            ? '<div class="text-white text-center"><div style="font-size:3rem">📦</div><div class="fw-bold">All 5 Decks Combined</div></div>'
                            : `<img id="${imgId}" alt="" style="display:none;width:100%;object-fit:cover"><span id="${imgId}-fallback" class="text-secondary small">Loading commander art…</span>`}
                    </div>
                    <div class="card-body">
                        <h6 class="card-title mb-1">${isMeta ? "Set of 5 (combined)" : deckShortName(d)}</h6>
                        ${isMeta
                            ? '<div class="small text-warning mb-1">📋 One CSV per platform — quantities merged across all 5 decks</div>'
                            : (cmd ? `<div class="small text-muted mb-1">⚔ ${cmd.name}</div>` : '')}
                        <div class="small">
                            MSRP <strong>${fmtUsd(d.msrp)}</strong>
                            · TCG <code>${d.tcgplayer_id || "—"}</code>
                        </div>
                    </div>
                </div>
            </div>`;
    }).join("");

    root.innerHTML = `
        ${breadcrumb()}
        <div class="card">
            <div class="card-header bg-primary text-white d-flex align-items-center">
                <img src="${setIconUrl(State.activeSet)}" alt=""
                     style="height:32px;width:32px;margin-right:.5rem;filter:invert(1)"
                     onerror="this.style.display='none'">
                <h5 class="m-0">${setName} — pick a deck</h5>
            </div>
            <div class="card-body"><div class="row">${cards}</div></div>
        </div>`;
    bindBreadcrumbNav();

    // Lazy-load commander art for each deck
    for (const d of decks) {
        if (d.product_type === "commander-deck-set-of-5") continue;
        const cmd = commanderInfoForDeck(State.activeSet, d.product_type);
        if (!cmd) continue;
        const imgId = `cmd-${d.product_type}`;
        fetchCommanderArt(cmd.set, cmd.number).then(url => {
            if (!url) return;
            const img = document.getElementById(imgId);
            const fb = document.getElementById(imgId + "-fallback");
            if (img) { img.src = url; img.style.display = "block"; }
            if (fb) { fb.style.display = "none"; }
        });
    }

    document.querySelectorAll("[data-deck]").forEach(el => {
        el.addEventListener("click", () => {
            const d = decks.find(x => x.product_type === el.dataset.deck);
            if (d) openDeck(d);
        });
    });
}

function deckShortName(deck) {
    if (!deck) return "";
    const name = deck.name || deck.product_type;
    const m = name.match(/Deck\s+(.+)$/i);
    return m ? m[1] : name;
}

// --- Deck detail -------------------------------------------------------

function openDeck(deck) {
    State.view = "detail";
    State.activeDeck = deck;
    State.activeCards = getDeckCards(deck.product_type);
    State.overrides = {};
    renderDeckDetail();
}

function renderDeckDetail() {
    const deck = State.activeDeck;
    const plan = computePlan(State.activeCards, State.mode, State.overrides, State.rules, State.filters);
    const root = document.getElementById("root");

    root.innerHTML = `
        ${breadcrumb()}
        <div class="card">
            <div class="card-header bg-success text-white d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                    <strong>${deckShortName(deck)}</strong>
                    <span class="text-light-emphasis small ms-2">
                        (${State.activeCards.length} unique / ${State.activeCards.reduce((a,c) => a + (c.quantity||1), 0)} total
                        ${plan.hiddenCount ? ` · <span class="badge text-bg-warning">${plan.hiddenCount} hidden</span>` : ""}
                        · MSRP ${fmtUsd(deck.msrp)})
                    </span>
                </div>
                <div class="d-flex gap-2 align-items-center flex-wrap">
                    <div class="btn-group btn-group-sm" role="group" aria-label="Mode">
                        ${["tcgplayer","manapool","ebay","mixed"].map(k => `
                            <input type="radio" class="btn-check" name="mode" id="mode-${k}" value="${k}" ${State.mode===k?"checked":""}>
                            <label class="btn btn-outline-light" for="mode-${k}">${labelForMode(k)}</label>
                        `).join("")}
                    </div>
                    <button id="rulesBtn" class="btn btn-sm btn-light" title="Pricing rules">
                        ⚙ Rules ${rulesSummaryBadge(State.rules)}
                    </button>
                    <button id="refreshBtn" class="btn btn-sm btn-light" title="Refresh prices from Scryfall (TCG) + Mana Pool live">
                        ↻ Refresh
                    </button>
                    <button id="exportBtn" class="btn btn-sm btn-warning fw-bold">⬇ Export CSV(s)</button>
                </div>
            </div>
            <div class="card-body">
                ${State.showRules ? renderRulesPanel(State.rules) : ""}
                <div class="d-flex justify-content-between align-items-center mb-2 small text-muted">
                    <span id="priceFreshness">Prices from market tracker (cron, ~24h fresh).</span>
                    <span id="exportSummary"></span>
                </div>
                ${renderRoiSummary(plan, deck)}
                ${renderCardTable(plan)}
            </div>
        </div>
    `;
    bindBreadcrumbNav();

    document.querySelectorAll('input[name="mode"]').forEach(r => {
        r.addEventListener("change", e => {
            State.mode = e.target.value;
            State.overrides = {};
            renderDeckDetail();
        });
    });

    document.getElementById("rulesBtn").addEventListener("click", () => {
        State.showRules = !State.showRules;
        renderDeckDetail();
    });

    bindRulesPanel();

    document.querySelectorAll(".sortable").forEach(th => {
        th.addEventListener("click", e => {
            const col = th.dataset.sort;
            const additive = e.shiftKey;
            const idx = State.sort.findIndex(s => s.col === col);
            if (additive) {
                // Shift+click: add as secondary, or toggle direction if already in stack
                if (idx === -1) {
                    State.sort.push({ col, dir: "asc" });
                } else {
                    State.sort[idx].dir = State.sort[idx].dir === "asc" ? "desc" : "asc";
                }
            } else {
                // Plain click: reset to single sort, toggle dir if already primary
                if (State.sort.length === 1 && State.sort[0].col === col) {
                    State.sort = [{ col, dir: State.sort[0].dir === "asc" ? "desc" : "asc" }];
                } else {
                    State.sort = [{ col, dir: "asc" }];
                }
            }
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

    document.getElementById("refreshBtn").addEventListener("click", async () => {
        const btn = document.getElementById("refreshBtn");
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = "⌛ Refreshing…";
        const start = performance.now();
        try {
            const r = await refreshDeckPrices(State.activeCards);
            const elapsed = ((performance.now() - start) / 1000).toFixed(1);
            renderDeckDetail();
            document.getElementById("priceFreshness").textContent =
                `Refreshed ${r.updated} price points in ${elapsed}s. TCG via Scryfall (~24h), Mana Pool live.`;
        } catch (e) {
            console.error(e);
            btn.innerHTML = orig;
            btn.disabled = false;
            alert("Refresh failed: " + e.message);
        }
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
                <div class="text-muted">Sealed cost</div><div class="fs-5">${fmtUsd(cost)}</div>
            </div></div>
            <div class="col"><div class="border rounded py-2 small">
                <div class="text-muted">Gross proceeds</div><div class="fs-5">${fmtUsd(plan.totalGross)}</div>
            </div></div>
            <div class="col"><div class="border rounded py-2 small">
                <div class="text-muted">Net after fees</div><div class="fs-5">${fmtUsd(plan.totalNet)}</div>
            </div></div>
            <div class="col"><div class="border rounded py-2 small">
                <div class="text-muted">Profit</div>
                <div class="fs-5 ${roiClass}">${fmtUsd(profit)} <small>(${roiPct.toFixed(1)}%)</small></div>
            </div></div>
            <div class="col"><div class="border rounded py-2 small">
                <div class="text-muted">Priced</div>
                <div class="fs-5">${plan.cardsWithPrice}/${plan.cardsWithPrice + plan.cardsWithoutPrice}</div>
            </div></div>
        </div>`;
}

function rulesSummaryBadge(r) {
    const parts = [];
    if (r.basis !== "platform") parts.push(r.basis);
    if (r.markupPct) parts.push(`${r.markupPct >= 0 ? "+" : ""}${(r.markupPct*100).toFixed(0)}%`);
    if (r.floor && r.floor > 0) parts.push(`floor $${r.floor}`);
    if (r.ceiling && r.ceiling > 0) parts.push(`cap $${r.ceiling}`);
    if (r.roundTo && r.roundTo !== 0.01) parts.push(`→${r.roundTo}`);
    return parts.length ? `<span class="badge text-bg-warning ms-1">${parts.join(" · ")}</span>` : "";
}

function renderRulesPanel(r) {
    return `
        <div class="card mb-3 bg-light">
            <div class="card-body py-2">
                <div class="row g-2 align-items-center">
                    <div class="col-md-3">
                        <label class="form-label small mb-1">Price basis</label>
                        <select id="rule-basis" class="form-select form-select-sm">
                            <option value="platform" ${r.basis==='platform'?'selected':''}>Platform price (default)</option>
                            <option value="max"      ${r.basis==='max'?'selected':''}>Max of TCG/MP</option>
                            <option value="min"      ${r.basis==='min'?'selected':''}>Min of TCG/MP</option>
                            <option value="tcg"      ${r.basis==='tcg'?'selected':''}>Always TCG market</option>
                            <option value="mp"       ${r.basis==='mp'?'selected':''}>Always MP from-price</option>
                        </select>
                    </div>
                    <div class="col-md-2">
                        <label class="form-label small mb-1">Markup % <span class="text-muted">(can be negative)</span></label>
                        <div class="input-group input-group-sm">
                            <input id="rule-markup" type="number" step="1" class="form-control" value="${(r.markupPct*100).toFixed(0)}">
                            <span class="input-group-text">%</span>
                        </div>
                    </div>
                    <div class="col-md-2">
                        <label class="form-label small mb-1">Floor</label>
                        <div class="input-group input-group-sm">
                            <span class="input-group-text">$</span>
                            <input id="rule-floor" type="number" step="0.05" min="0" class="form-control" value="${r.floor||0}">
                        </div>
                    </div>
                    <div class="col-md-2">
                        <label class="form-label small mb-1">Ceiling <span class="text-muted">(0=off)</span></label>
                        <div class="input-group input-group-sm">
                            <span class="input-group-text">$</span>
                            <input id="rule-ceiling" type="number" step="0.05" min="0" class="form-control" value="${r.ceiling||0}">
                        </div>
                    </div>
                    <div class="col-md-2">
                        <label class="form-label small mb-1">Round to</label>
                        <select id="rule-round" class="form-select form-select-sm">
                            ${[0.01, 0.05, 0.10, 0.25, 0.50, 0.99].map(v =>
                                `<option value="${v}" ${r.roundTo===v?'selected':''}>$${v.toFixed(2)}</option>`
                            ).join("")}
                        </select>
                    </div>
                    <div class="col-md-1 d-flex align-items-end">
                        <button id="rule-reset" class="btn btn-sm btn-outline-secondary w-100" title="Reset to defaults">↺</button>
                    </div>
                </div>
                <hr class="my-2">
                <div class="row g-2 align-items-center">
                    <div class="col-md-4">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="filter-bulk" ${State.filters.hideBulkBasics?'checked':''}>
                            <label class="form-check-label small" for="filter-bulk">
                                Hide bulk basic lands
                                <span class="text-muted">(common Plains/Island/etc. below threshold)</span>
                            </label>
                        </div>
                    </div>
                    <div class="col-md-2">
                        <label class="form-label small mb-1">Bulk threshold</label>
                        <div class="input-group input-group-sm">
                            <span class="input-group-text">$</span>
                            <input id="filter-threshold" type="number" step="0.05" min="0" class="form-control" value="${State.filters.bulkThreshold||0}">
                        </div>
                    </div>
                    <div class="col-md-6 small text-muted align-self-end pb-1">
                        Basics with TCG or MP market price ≥ <strong>max(threshold, floor)</strong> stay in. Hidden rows are excluded from ROI and CSV.
                    </div>
                </div>
            </div>
        </div>`;
}

function bindRulesPanel() {
    const bind = (id, fn) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener("change", fn);
    };
    bind("rule-basis", e => updateRule({ basis: e.target.value }));
    bind("rule-markup", e => updateRule({ markupPct: parseFloat(e.target.value || 0) / 100 }));
    bind("rule-floor", e => updateRule({ floor: parseFloat(e.target.value || 0) }));
    bind("rule-ceiling", e => updateRule({ ceiling: parseFloat(e.target.value || 0) }));
    bind("rule-round", e => updateRule({ roundTo: parseFloat(e.target.value || 0.01) }));
    const reset = document.getElementById("rule-reset");
    if (reset) reset.addEventListener("click", () => {
        State.rules = { basis:"platform", markupPct:0, floor:0, ceiling:0, roundTo:0.01 };
        saveRules(State.rules);
        renderDeckDetail();
    });

    const bulk = document.getElementById("filter-bulk");
    if (bulk) bulk.addEventListener("change", e => updateFilter({ hideBulkBasics: e.target.checked }));
    const thresh = document.getElementById("filter-threshold");
    if (thresh) thresh.addEventListener("change", e => updateFilter({ bulkThreshold: parseFloat(e.target.value || 0) }));
}

function updateFilter(patch) {
    State.filters = { ...State.filters, ...patch };
    saveFilters(State.filters);
    renderDeckDetail();
}

function updateRule(patch) {
    State.rules = { ...State.rules, ...patch };
    saveRules(State.rules);
    renderDeckDetail();
}

const SORT_KEYS = {
    card_number: l => [l.set_code || "", numericCnKey(l.card_number)],
    name:        l => (l.name || "").toLowerCase(),
    rarity:      l => [rarityRank(l.rarity), (l.name || "").toLowerCase()],
    qty:         l => -(l.quantity || 1),
    tcg:         l => -(l.prices.tcgplayer ?? -Infinity),
    mp:          l => -(l.prices.manapool ?? -Infinity),
    list:        l => -(l.list ?? -Infinity),
    net:         l => -(l.net ?? -Infinity),
    platform:    l => l.assigned || "zzz",
};

function numericCnKey(cn) {
    // "12" -> [12, ""], "12s" -> [12, "s"], "abc" -> [Infinity, "abc"]
    const m = String(cn || "").match(/^(\d+)(.*)$/);
    if (!m) return [Infinity, String(cn || "").toLowerCase()];
    return [parseInt(m[1], 10), m[2].toLowerCase()];
}

function sortLines(lines, sortStack) {
    /**
     * Apply each sort key in order: primary first; ties broken by secondary, etc.
     * `sortStack` is an array of { col, dir }.
     */
    const stack = (sortStack && sortStack.length) ? sortStack : [{ col: "card_number", dir: "asc" }];
    const keyFns = stack.map(s => ({
        fn: SORT_KEYS[s.col] || SORT_KEYS.card_number,
        sign: s.dir === "desc" ? -1 : 1,
    }));
    return lines.slice().sort((a, b) => {
        for (const { fn, sign } of keyFns) {
            const cmp = compareKeys(fn(a), fn(b));
            if (cmp !== 0) return sign * cmp;
        }
        return 0;
    });
}

function compareKeys(a, b) {
    if (Array.isArray(a) && Array.isArray(b)) {
        for (let i = 0; i < Math.max(a.length, b.length); i++) {
            const c = compareKeys(a[i], b[i]);
            if (c !== 0) return c;
        }
        return 0;
    }
    if (a === b) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return a < b ? -1 : 1;
}

function sortIndicator(col) {
    const idx = State.sort.findIndex(s => s.col === col);
    if (idx === -1) return '<span class="text-muted small ms-1">↕</span>';
    const s = State.sort[idx];
    const arrow = s.dir === "asc" ? "↑" : "↓";
    const rank = State.sort.length > 1 ? `<sup class="text-muted">${idx + 1}</sup>` : "";
    return ` <span class="small">${arrow}${rank}</span>`;
}

function renderCardTable(plan) {
    const visibleLines = plan.lines.filter(l => !l.hidden);
    const sortedLines = sortLines(visibleLines, State.sort);
    const rows = sortedLines.map(line => {
        const key = `${line.set_code}|${line.card_number}`;
        const tcg = line.prices.tcgplayer;
        const mp = line.prices.manapool;
        const assigned = line.assigned;
        const isOverride = line.override;
        const tcgUrl = line.tcgplayer_id ? `https://www.tcgplayer.com/product/${line.tcgplayer_id}` : null;
        const mpUrl = `https://manapool.com/card/${line.set_code}/${encodeURIComponent(line.card_number)}`;
        const links = [
            tcgUrl ? `<a href="${tcgUrl}" target="_blank" rel="noopener" class="badge text-bg-primary text-decoration-none ms-1" title="View on TCGPlayer">TCG ↗</a>` : "",
            `<a href="${mpUrl}" target="_blank" rel="noopener" class="badge text-bg-secondary text-decoration-none ms-1" title="View on Mana Pool">MP ↗</a>`,
        ].join("");
        const qty = line.quantity || 1;
        return `
            <tr>
                <td class="text-muted small">${line.set_code.toUpperCase()} #${line.card_number}</td>
                <td><img class="card-thumb" src="${cardImageUrl(line.set_code, line.card_number)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${scryfallImageUrl(line.set_code, line.card_number)}'"></td>
                <td>${line.name}${links}</td>
                <td class="small">${rarityBadge(line.rarity)}</td>
                <td class="text-end ${qty>1?'fw-bold':''}">${qty}</td>
                <td class="text-end" title="gross">${fmtUsd(tcg)}</td>
                <td class="text-end" title="gross">${fmtUsd(mp)}</td>
                <td class="text-end fw-bold ${assigned ? 'table-success' : ''}" title="rules-applied list price">${fmtUsd(line.list)}</td>
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

    const th = (col, label, extraClass = "") =>
        `<th class="${extraClass} sortable" data-sort="${col}" style="cursor:pointer;user-select:none">${label}${sortIndicator(col)}</th>`;

    return `
        <div class="table-responsive">
            <table class="table table-sm table-hover align-middle">
                <thead class="table-light">
                    <tr>
                        ${th("card_number", "Set/#")}
                        <th></th>
                        ${th("name", "Card")}
                        ${th("rarity", "Rarity")}
                        ${th("qty", "Qty", "text-end")}
                        ${th("tcg", "TCG mkt", "text-end")}
                        ${th("mp", "MP from", "text-end")}
                        ${th("list", "List $", "text-end")}
                        ${th("net", "Net", "text-end")}
                        ${th("platform", "Platform")}
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            <small class="text-muted">
              <strong>List $</strong> = market basis × rules (markup, floor, ceiling, rounding).
              <strong>Net</strong> = list price − platform fees (TCG ~12.75%, MP ~5%, eBay ~13.25%).
              eBay uses TCGPlayer market as a proxy until eBay scraping is wired up.
              Click a column header to sort; <kbd>Shift</kbd>+click adds a secondary sort.
            </small>
        </div>`;
}

function rarityBadge(r) {
    if (!r) return "";
    const k = String(r).toLowerCase();
    const cls = {
        mythic: "text-bg-warning",
        rare:   "text-bg-info",
        uncommon: "text-bg-secondary",
        common: "text-bg-light text-dark border",
    }[k] || "text-bg-light text-dark border";
    return `<span class="badge ${cls}">${k[0]?.toUpperCase() || "?"}</span>`;
}

function cardImageUrl(setCode, cardNumber) {
    return `https://storage.googleapis.com/collection-tracker-data/images/cards/mtg/${setCode}/${encodeURIComponent(cardNumber)}.jpg`;
}

function scryfallImageUrl(setCode, cardNumber) {
    return `https://api.scryfall.com/cards/${setCode}/${encodeURIComponent(cardNumber)}?format=image&version=small`;
}
