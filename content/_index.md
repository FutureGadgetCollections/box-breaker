---
title: "Deck Selector & Export"
description: "Choose a Secrets of Strixhaven deck and export for maximum ROI"
---

<div class="row">
    <div class="col-lg-8 mx-auto">
        <div class="card mb-4">
            <div class="card-header bg-primary text-white">
                <h5>Secrets of Strixhaven - Choose Your Deck</h5>
            </div>
            <div class="card-body">
                <div id="deck-selector" class="mb-4">
                    <div class="row" id="deckGrid"></div>
                </div>
            </div>
        </div>

        <div class="card" id="exportCard" style="display: none;">
            <div class="card-header bg-success text-white">
                <h5>Export Deck & Optimize ROI</h5>
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <label class="form-label"><strong>Select Platforms to List:</strong></label>
                    <div class="form-check">
                        <input class="form-check-input platform-checkbox" type="checkbox" id="platform-tcgplayer" value="tcgplayer" checked>
                        <label class="form-check-label" for="platform-tcgplayer">TCGPlayer</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input platform-checkbox" type="checkbox" id="platform-manapool" value="manapool">
                        <label class="form-check-label" for="platform-manapool">ManaPool</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input platform-checkbox" type="checkbox" id="platform-ebay" value="ebay">
                        <label class="form-check-label" for="platform-ebay">eBay</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input platform-checkbox" type="checkbox" id="platform-mixed" value="mixed">
                        <label class="form-check-label" for="platform-mixed">Mixed (Auto-optimize ROI)</label>
                    </div>
                </div>
                <div id="roiResults" class="alert alert-info" style="display: none;"></div>
                <button id="exportBtn" class="btn btn-success">Download CSV</button>
            </div>
        </div>

        <div id="loadingSpinner" class="text-center mt-4" style="display: none;">
            <div class="spinner-border" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p>Loading deck data...</p>
        </div>
    </div>
</div>
