// Initializes the search panel: From/To picker sheet, filters, and preview button.
export function initSearchPanel({ hostId, poiOptions, onSelectionChange, onPreview }) {
  const host = document.querySelector(hostId);
  if (!host) return;

  const fromTriggerEl = host.querySelector("#fromTrigger");
  const fromSelectionEl = host.querySelector("#fromSelection");
  const toTriggerEl = host.querySelector("#toTrigger");
  const toSelectionEl = host.querySelector("#toSelection");
  const swapButtonEl = host.querySelector("#swapButton");
  const previewButtonEl = host.querySelector("#previewButton");
  const clearButtonEl = host.querySelector("#clearButton");

  const pickerSheetEl = host.querySelector("#pickerSheet");
  const pickerCloseEl = host.querySelector("#pickerClose");
  const pickerSearchEl = host.querySelector("#pickerSearch");
  const pickerChipsEl = host.querySelector("#pickerChips");
  const pickerStatusEl = host.querySelector("#pickerStatus");
  const pickerResultsEl = host.querySelector("#pickerResults");
  const filterToggleEl = host.querySelector("#filterToggle");
  const filterSummaryEl = host.querySelector("#filterSummary");
  const filterContentEl = host.querySelector("#filterContent");
  const filterBuildingEl = host.querySelector("#filterBuilding");
  const filterFloorEl = host.querySelector("#filterFloor");
  const filterCategoryEl = host.querySelector("#filterCategory");
  const filterTypeEl = host.querySelector("#filterType");
  const filterOpenNowEl = host.querySelector("#filterOpenNow");

  /** @type {string} */
  let startId = "";
  /** @type {string} */
  let endId = "";
  /** @type {"from"|"to"|null} */
  let pickerMode = null;
  /** @type {string} */
  let selectedCategoryChip = "";
  /** @type {string} */
  let filterBuilding = "";
  /** @type {string} */
  let filterFloor = "";
  /** @type {string} */
  let filterCategory = "";
  /** @type {string} */
  let filterType = "";
  /** @type {boolean} */
  let filterOpenNow = false;

  const QUICK_CATEGORIES = ["ENTRANCE", "WASHROOM", "ELEVATOR", "INFORMATION", "FOOD"];

  const compareByName = (a, b) =>
    (a.displayName || a.label || "").localeCompare(b.displayName || b.label || "", undefined, {
      sensitivity: "base"
    });

  const getPoiById = (poiId) => poiOptions.find((p) => String(p.value) === String(poiId)) || null;

  const formatPoiShort = (poi) => poi?.displayName || poi?.label || "Unknown";

  const getRatingDisplay = (poi) => {
    const rd = poi.ratingData || poi.rating_data;
    if (!rd) return "";
    const avg = rd["ratings-average"] || rd.ratingsAverage;
    return avg ? `★ ${avg}` : "";
  };

  const doesPoiMatchFilters = (poi, query) => {
    if (!poi) return false;
    const q = String(query || "").trim().toLowerCase();
    if (q) {
      const hay = `${poi.displayName || ""} ${poi.categoryName || ""} ${poi.domainType || ""} building ${poi.buildingId || ""} floor ${poi.floorId || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (selectedCategoryChip && String(poi.categoryName || "").toUpperCase() !== selectedCategoryChip) return false;
    if (filterBuilding && String(poi.buildingId) !== filterBuilding) return false;
    if (filterFloor && String(poi.floorId) !== filterFloor) return false;
    if (filterCategory && String(poi.categoryName || "").toUpperCase() !== filterCategory) return false;
    if (filterType && String(poi.domainType) !== filterType) return false;
    if (filterOpenNow && poi.isOpen !== true) return false;
    return true;
  };

  const sizePickerToMap = () => {
    const mapEl = document.querySelector("#routePreview .map-container");
    const panel = pickerSheetEl?.querySelector(".picker-sheet__panel");
    if (!panel) return;

    const isLandscape = window.matchMedia("(orientation: landscape)").matches;
    if (isLandscape && pickerSheetEl?.classList.contains("picker-sheet--landscape")) {
      panel.style.width = "min(90vw, 800px)";
      panel.style.height = "min(85vh, 400px)";
      panel.style.minHeight = "250px";
    } else if (mapEl) {
      const rect = mapEl.getBoundingClientRect();
      panel.style.width = `${rect.width}px`;
      panel.style.height = `${rect.height}px`;
      panel.style.minHeight = `${rect.height}px`;
    }
  };

  const updatePickerLandscapeClass = () => {
    const isLandscape = window.matchMedia("(orientation: landscape)").matches;
    pickerSheetEl?.classList.toggle("picker-sheet--landscape", isLandscape && !pickerSheetEl.hidden);
  };

  const openPicker = (mode) => {
    pickerMode = mode;
    pickerSearchEl.value = "";
    selectedCategoryChip = "";
    pickerChipsEl.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", "false"));
    filterBuilding = "";
    filterFloor = "";
    filterCategory = "";
    filterType = "";
    filterOpenNow = false;
    if (filterBuildingEl) filterBuildingEl.value = "";
    if (filterFloorEl) filterFloorEl.value = "";
    if (filterCategoryEl) filterCategoryEl.value = "";
    if (filterTypeEl) filterTypeEl.value = "";
    if (filterOpenNowEl) filterOpenNowEl.checked = false;
    updateFilterSummary();

    pickerSheetEl.hidden = false;
    pickerSheetEl.removeAttribute("aria-hidden");
    fromTriggerEl?.setAttribute("aria-expanded", mode === "from" ? "true" : "false");
    toTriggerEl?.setAttribute("aria-expanded", mode === "to" ? "true" : "false");

    updatePickerLandscapeClass();
    sizePickerToMap();
    renderPickerResults();
    requestAnimationFrame(() => pickerSearchEl?.focus());
  };

  const closePickerAndFocus = (triggerEl) => {
    pickerSheetEl.hidden = true;
    pickerSheetEl.setAttribute("aria-hidden", "true");
    pickerSheetEl?.classList.remove("picker-sheet--landscape");
    fromTriggerEl?.setAttribute("aria-expanded", "false");
    toTriggerEl?.setAttribute("aria-expanded", "false");
    pickerMode = null;
    triggerEl?.focus();
  };

  const updateFilterSummary = () => {
    if (!filterSummaryEl) return;
    const parts = [];
    if (filterBuilding) parts.push(filterBuilding);
    if (filterFloor) parts.push(filterFloor);
    if (filterCategory) parts.push(filterCategory);
    if (filterType) parts.push(filterType);
    if (filterOpenNow) parts.push("Open now");
    filterSummaryEl.textContent = parts.length ? parts.join(", ") : "Filters";
  };

  const renderPickerResults = () => {
    if (!pickerResultsEl || !pickerMode) return;
    const query = pickerSearchEl?.value || "";
    const endpoint = pickerMode;
    const matches = poiOptions
      .filter((p) => doesPoiMatchFilters(p, endpoint, query))
      .sort(compareByName)
      .slice(0, 24);

    pickerResultsEl.innerHTML = "";
    if (pickerStatusEl) {
      pickerStatusEl.textContent = matches.length === 0 ? "No matches." : `${matches.length} result${matches.length === 1 ? "" : "s"}.`;
    }

    if (matches.length === 0) {
      const li = document.createElement("li");
      li.className = "picker-result picker-result--empty";
      li.textContent = "No matches";
      pickerResultsEl.appendChild(li);
      return;
    }

    matches.forEach((poi) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "picker-result";
      btn.dataset.poiId = String(poi.value);

      const name = poi.displayName || poi.label || "Unknown";
      const cat = poi.categoryName || "Location";
      const b = poi.buildingId ? `Building ${poi.buildingId}` : "";
      const f = poi.floorId ? `Floor ${poi.floorId}` : "";
      const sub = [cat, b, f].filter(Boolean).join(" · ");
      const rating = getRatingDisplay(poi);
      const openLabel = poi.isOpen ? "Open" : "Closed";
      const openClass = poi.isOpen ? "picker-result__open" : "picker-result__closed";

      btn.innerHTML = `
        <span class="picker-result__main">
          <span class="picker-result__name">${escapeHtml(name)}</span>
          <span class="picker-result__sub">${escapeHtml(sub)}</span>
        </span>
        <span class="picker-result__meta">
          ${rating ? `<span class="picker-result__rating">${escapeHtml(rating)}</span>` : ""}
          <span class="picker-result__status ${openClass}">${openLabel}</span>
        </span>
      `;
      btn.setAttribute("aria-label", `${name}, ${cat}, Building ${poi.buildingId}, Floor ${poi.floorId}, ${openLabel}`);

      btn.addEventListener("click", () => {
        const mode = pickerMode;
        const trigger = mode === "from" ? toTriggerEl : (startId ? previewButtonEl : fromTriggerEl);
        closePickerAndFocus(trigger);
        if (mode === "from") {
          setStart(poi.value);
        } else {
          setDestination(poi.value);
        }
      });

      li.appendChild(btn);
      pickerResultsEl.appendChild(li);
    });
  };

  const escapeHtml = (s) => {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  };

  const setStart = (poiId) => {
    const poi = getPoiById(poiId);
    if (!poi) return;
    startId = String(poi.value);
    fromSelectionEl.textContent = formatPoiShort(poi);
    updateButtons();
    notifySelectionChange();
    if (pickerStatusEl) pickerStatusEl.textContent = `Start set to ${formatPoiShort(poi)}.`;
  };

  const setDestination = (poiId) => {
    const poi = getPoiById(poiId);
    if (!poi) return;
    endId = String(poi.value);
    toSelectionEl.textContent = formatPoiShort(poi);
    updateButtons();
    notifySelectionChange();
    if (pickerStatusEl) pickerStatusEl.textContent = `Destination set to ${formatPoiShort(poi)}.`;
  };

  const updateButtons = () => {
    const hasStart = Boolean(startId);
    const hasEnd = Boolean(endId);
    clearButtonEl.disabled = !(hasStart || hasEnd);
    swapButtonEl.disabled = !(hasStart && hasEnd);
    previewButtonEl.disabled = !(hasStart && hasEnd);
    fromTriggerEl?.closest(".from-to-field")?.classList.toggle("has-selection", hasStart);
    toTriggerEl?.closest(".from-to-field")?.classList.toggle("has-selection", hasEnd);
  };

  const notifySelectionChange = () => {
    onSelectionChange?.({
      startId,
      endId,
      domainType: filterType,
      openNowOnly: filterOpenNow
    });
  };

  // Populate filter dropdowns
  const buildings = [...new Set(poiOptions.map((p) => p.buildingId).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
  const floors = [...new Set(poiOptions.map((p) => p.floorId).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
  const categories = [...new Set(poiOptions.map((p) => (p.categoryName || "").toUpperCase()).filter(Boolean))].sort();
  const types = [...new Set(poiOptions.map((p) => p.domainType).filter(Boolean))].sort();

  if (filterBuildingEl) {
    filterBuildingEl.innerHTML = '<option value="">Select building</option>';
    buildings.forEach((id) => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = id;
      filterBuildingEl.appendChild(opt);
    });
  }
  if (filterFloorEl) {
    filterFloorEl.innerHTML = '<option value="">Select floor</option>';
    floors.forEach((id) => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = id;
      filterFloorEl.appendChild(opt);
    });
  }
  if (filterCategoryEl) {
    filterCategoryEl.innerHTML = '<option value="">Select category</option>';
    categories.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      filterCategoryEl.appendChild(opt);
    });
  }
  if (filterTypeEl) {
    filterTypeEl.innerHTML = '<option value="">Select type</option>';
    types.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      filterTypeEl.appendChild(opt);
    });
  }

  // Quick category chips
  QUICK_CATEGORIES.forEach((cat) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.dataset.value = cat;
    btn.setAttribute("aria-pressed", "false");
    btn.textContent = cat;
    btn.addEventListener("click", () => {
      selectedCategoryChip = selectedCategoryChip === cat ? "" : cat;
      pickerChipsEl.querySelectorAll(".chip").forEach((c) => {
        c.setAttribute("aria-pressed", c.dataset.value === selectedCategoryChip ? "true" : "false");
      });
      renderPickerResults();
    });
    pickerChipsEl.appendChild(btn);
  });

  // Filter change handlers
  [filterBuildingEl, filterFloorEl, filterCategoryEl, filterTypeEl].forEach((el) => {
    el?.addEventListener("change", () => {
      filterBuilding = filterBuildingEl?.value || "";
      filterFloor = filterFloorEl?.value || "";
      filterCategory = filterCategoryEl?.value || "";
      filterType = filterTypeEl?.value || "";
      updateFilterSummary();
      renderPickerResults();
    });
  });
  filterOpenNowEl?.addEventListener("change", () => {
    filterOpenNow = Boolean(filterOpenNowEl.checked);
    updateFilterSummary();
    renderPickerResults();
  });

  // Filter toggle
  filterToggleEl?.addEventListener("click", () => {
    const expanded = filterContentEl?.hasAttribute("hidden");
    filterContentEl?.toggleAttribute("hidden", !expanded);
    filterToggleEl?.setAttribute("aria-expanded", String(expanded));
    filterToggleEl.querySelector(".filter-toggle__icon")?.setAttribute("aria-hidden", "true");
  });

  // Picker search
  pickerSearchEl?.addEventListener("input", () => renderPickerResults());
  pickerSearchEl?.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closePickerAndFocus(pickerMode === "from" ? fromTriggerEl : toTriggerEl);
    }
    if (e.key === "Enter") {
      const first = pickerResultsEl?.querySelector(".picker-result:not(.picker-result--empty)");
      if (first) first.click();
    }
  });

  // Picker close button
  pickerCloseEl?.addEventListener("click", () => {
    closePickerAndFocus(pickerMode === "from" ? fromTriggerEl : toTriggerEl);
  });

  // Picker backdrop
  pickerSheetEl?.querySelector(".picker-sheet__backdrop")?.addEventListener("click", () => {
    closePickerAndFocus(pickerMode === "from" ? fromTriggerEl : toTriggerEl);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && pickerSheetEl && !pickerSheetEl.hidden) {
      closePickerAndFocus(pickerMode === "from" ? fromTriggerEl : toTriggerEl);
    }
  });

  window.addEventListener("resize", () => {
    if (pickerSheetEl && !pickerSheetEl.hidden) {
      updatePickerLandscapeClass();
      sizePickerToMap();
    }
  });
  window.addEventListener("orientationchange", () => {
    if (pickerSheetEl && !pickerSheetEl.hidden) {
      setTimeout(() => {
        updatePickerLandscapeClass();
        sizePickerToMap();
      }, 100);
    }
  });

  // From/To triggers
  fromTriggerEl?.addEventListener("click", () => openPicker("from"));
  toTriggerEl?.addEventListener("click", () => openPicker("to"));

  // Clear buttons
  clearButtonEl?.addEventListener("click", () => {
    startId = "";
    endId = "";
    fromSelectionEl.textContent = "Search here";
    toSelectionEl.textContent = "Choose destination";
    updateButtons();
    notifySelectionChange();
  });

  // Swap
  swapButtonEl?.addEventListener("click", () => {
    if (!startId || !endId) return;
    const prevStart = startId;
    startId = endId;
    endId = prevStart;
    const startPoi = getPoiById(startId);
    const endPoi = getPoiById(endId);
    fromSelectionEl.textContent = startPoi ? formatPoiShort(startPoi) : "Choose start";
    toSelectionEl.textContent = endPoi ? formatPoiShort(endPoi) : "Choose destination";
    updateButtons();
    notifySelectionChange();
  });

  previewButtonEl?.addEventListener("click", () => onPreview?.());

  // Initial
  fromSelectionEl.textContent = "Search here";
  toSelectionEl.textContent = "Choose destination";
  updateButtons();
  notifySelectionChange();

  return {
    setStart: (poiId) => setStart(poiId),
    setDestination: (poiId) => setDestination(poiId),
    getCurrentSelection: () => ({ startId, endId, domainType: filterType, openNowOnly: filterOpenNow })
  };
}
