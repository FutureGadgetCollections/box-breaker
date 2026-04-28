---
title: "Box Breaker"
description: "Pick a sealed product, optimize per-card ROI across TCGPlayer / ManaPool / eBay, export listing CSVs."
---

<div class="row">
<div class="col-12">

<div id="deckPickerCard" class="card mb-4">
<div class="card-header bg-primary text-white">
<h5 class="m-0">Secrets of Strixhaven Commander — pick a deck to break down</h5>
</div>
<div class="card-body">
<div class="row" id="deckGrid"></div>
</div>
</div>

<div id="deckDetail" style="display:none"></div>

<div id="loadingSpinner" class="text-center mt-4" style="display:none">
<div class="spinner-border" role="status">
<span class="visually-hidden">Loading...</span>
</div>
<p class="text-muted small">Loading market tracker data…</p>
</div>

</div>
</div>
