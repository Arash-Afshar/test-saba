export function initSearchPanel({ hostId, poiOptions, onSelectionChange, onPreview }) {
  const host = document.querySelector(hostId);
  if (!host) return;

  // -------- Selector initializations --------
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
  const filterContentEl = host.querySelector("#filterContent");
  const filterBuildingEl = host.querySelector("#filterBuilding");
  const filterFloorEl = host.querySelector("#filterFloor");
  const filterCategoryEl = host.querySelector("#filterCategory");
  const filterTypeEl = host.querySelector("#filterType");
  const filterOpenNowEl = host.querySelector("#filterOpenNow");

  let startId = "";
  let endId = "";
  let pickerMode = null;
  let selectedCategoryChip = "";
  let filterBuilding = "";
  let filterFloor = "";
  let filterCategory = "";
  let filterType = "";
  let filterOpenNow = false;

  // -------- Shared helpers --------
  const escapeHtml = (value) => {
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
  };

  const compareByName = (a, b) =>
    (a.displayName || a.label || "").localeCompare(b.displayName || b.label || "", undefined, {
      sensitivity: "base"
    });

  const getPoiById = (poiId) => poiOptions.find((p) => String(p.value) === String(poiId)) || null;

  const formatPoiShort = (poi) => poi?.displayName || poi?.label || "Unknown";

  const getRatingDisplay = (poi) => {
    const ratingData = poi.ratingData || poi.rating_data;
    if (!ratingData) return "";
    const average = ratingData["ratings-average"] || ratingData.ratingsAverage;
    return average ? `★ ${average}` : "";
  };

  // -------- UI sync helpers --------
  const syncFilterControls = () => {
    if (filterBuildingEl) filterBuildingEl.value = filterBuilding;
    if (filterFloorEl) filterFloorEl.value = filterFloor;
    if (filterCategoryEl) filterCategoryEl.value = filterCategory;
    if (filterTypeEl) filterTypeEl.value = filterType;
    if (filterOpenNowEl) filterOpenNowEl.checked = filterOpenNow;
  };

  const syncCategoryChipState = () => {
    pickerChipsEl?.querySelectorAll(".chip").forEach((chip) => {
      chip.setAttribute("aria-pressed", chip.dataset.value === selectedCategoryChip ? "true" : "false");
    });
  };

  // -------- Data preparation --------
  const getUniqueSortedValues = (pickValue, sortFn) => {
    const values = [...new Set(poiOptions.map(pickValue).filter(Boolean))];
    return sortFn ? values.sort(sortFn) : values.sort();
  };

  const filterData = {
    buildings: getUniqueSortedValues((poi) => poi.buildingId, (a, b) => Number(a) - Number(b)),
    floors: getUniqueSortedValues((poi) => poi.floorId, (a, b) => Number(a) - Number(b)),
    categories: getUniqueSortedValues((poi) => (poi.categoryName || "").toUpperCase()),
    types: getUniqueSortedValues((poi) => poi.domainType)
  };

  const populateSelect = (selectEl, placeholder, values) => {
    if (!selectEl) return;
    selectEl.innerHTML = `<option value="">${placeholder}</option>`;
    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      selectEl.appendChild(option);
    });
  };

  const setupFilterControls = () => {
    populateSelect(filterBuildingEl, "Select building", filterData.buildings);
    populateSelect(filterFloorEl, "Select floor", filterData.floors);
    populateSelect(filterCategoryEl, "Select category", filterData.categories);
    populateSelect(filterTypeEl, "Select type", filterData.types);
  };

  const QUICK_CATEGORIES = ["ENTRANCE", "WASHROOM", "ELEVATOR", "INFORMATION", "FOOD"];

  const setupCategoryChips = () => {
    if (!pickerChipsEl) return;

    pickerChipsEl.innerHTML = "";
    QUICK_CATEGORIES.forEach((category) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.dataset.value = category;
      chip.setAttribute("aria-pressed", "false");
      chip.textContent = category;

      chip.addEventListener("click", () => {
        selectedCategoryChip = selectedCategoryChip === category ? "" : category;
        syncCategoryChipState();
        renderPickerResults();
      });

      pickerChipsEl.appendChild(chip);
    });
  };

  // -------- Data filtering --------
  const readFiltersFromControls = () => {
    filterBuilding = filterBuildingEl?.value || "";
    filterFloor = filterFloorEl?.value || "";
    filterCategory = filterCategoryEl?.value || "";
    filterType = filterTypeEl?.value || "";
    filterOpenNow = Boolean(filterOpenNowEl?.checked);
  };

  const resetPickerFilters = () => {
    selectedCategoryChip = "";
    filterBuilding = "";
    filterFloor = "";
    filterCategory = "";
    filterType = "";
    filterOpenNow = false;
    syncCategoryChipState();
    syncFilterControls();
  };

  const buildFilterSearchText = (poi) =>
    `${poi.displayName || ""} ${poi.categoryName || ""} ${poi.domainType || ""} building ${poi.buildingId || ""} floor ${poi.floorId || ""}`.toLowerCase();

  const doesPoiMatchFilters = (poi, query) => {
    if (!poi) return false;
    const normalizedQuery = String(query || "").trim().toLowerCase();

    if (normalizedQuery && !buildFilterSearchText(poi).includes(normalizedQuery)) {
      return false;
    }

    if (selectedCategoryChip && String(poi.categoryName || "").toUpperCase() !== selectedCategoryChip) return false;
    if (filterBuilding && String(poi.buildingId) !== filterBuilding) return false;
    if (filterFloor && String(poi.floorId) !== filterFloor) return false;
    if (filterCategory && String(poi.categoryName || "").toUpperCase() !== filterCategory) return false;
    if (filterType && String(poi.domainType) !== filterType) return false;
    if (filterOpenNow && poi.isOpen !== true) return false;
    return true;
  };

  const toggleFilters = () => {
    if (!filterContentEl || !filterToggleEl) return;
    const willExpand = filterContentEl.hasAttribute("hidden");
    filterContentEl.toggleAttribute("hidden", !willExpand);
    filterToggleEl.setAttribute("aria-expanded", String(willExpand));
    filterToggleEl.querySelector(".filter-toggle__icon")?.setAttribute("aria-hidden", "true");
  };

  const getPickerMatches = () => {
    const query = pickerSearchEl?.value || "";
    return poiOptions.filter((poi) => doesPoiMatchFilters(poi, query)).sort(compareByName);
  };

  // -------- Selection state --------
  const updateButtons = () => {
    const hasStart = Boolean(startId);
    const hasEnd = Boolean(endId);
    if (clearButtonEl) clearButtonEl.disabled = !(hasStart || hasEnd);
    if (swapButtonEl) swapButtonEl.disabled = !(hasStart && hasEnd);
    if (previewButtonEl) previewButtonEl.disabled = !(hasStart && hasEnd);
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

  const setStart = (poiId) => {
    const poi = getPoiById(poiId);
    if (!poi) return;
    startId = String(poi.value);
    if (fromSelectionEl) fromSelectionEl.textContent = formatPoiShort(poi);
    updateButtons();
    notifySelectionChange();
    if (pickerStatusEl) pickerStatusEl.textContent = `Start set to ${formatPoiShort(poi)}.`;
  };

  const setDestination = (poiId) => {
    const poi = getPoiById(poiId);
    if (!poi) return;
    endId = String(poi.value);
    if (toSelectionEl) toSelectionEl.textContent = formatPoiShort(poi);
    updateButtons();
    notifySelectionChange();
    if (pickerStatusEl) pickerStatusEl.textContent = `Destination set to ${formatPoiShort(poi)}.`;
  };

  const clearSelection = () => {
    startId = "";
    endId = "";
    if (fromSelectionEl) fromSelectionEl.textContent = "Search here";
    if (toSelectionEl) toSelectionEl.textContent = "Choose destination";
    updateButtons();
    notifySelectionChange();
  };

  const swapSelection = () => {
    if (!startId || !endId) return;
    [startId, endId] = [endId, startId];
    const startPoi = getPoiById(startId);
    const endPoi = getPoiById(endId);
    if (fromSelectionEl) fromSelectionEl.textContent = startPoi ? formatPoiShort(startPoi) : "Choose start";
    if (toSelectionEl) toSelectionEl.textContent = endPoi ? formatPoiShort(endPoi) : "Choose destination";
    updateButtons();
    notifySelectionChange();
  };

  // -------- Picker layout + rendering for responsiveness --------
  const updatePickerLandscapeClass = () => {
    if (!pickerSheetEl) return;
    const isLandscape = window.matchMedia("(orientation: landscape)").matches;
    pickerSheetEl.classList.toggle("picker-sheet--landscape", isLandscape && !pickerSheetEl.hidden);
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

  const getPickerDismissTarget = () => (pickerMode === "from" ? fromTriggerEl : toTriggerEl);

  const closePickerAndFocus = (triggerEl) => {
    if (pickerSheetEl) {
      pickerSheetEl.hidden = true;
      pickerSheetEl.setAttribute("aria-hidden", "true");
      pickerSheetEl.classList.remove("picker-sheet--landscape");
    }
    fromTriggerEl?.setAttribute("aria-expanded", "false");
    toTriggerEl?.setAttribute("aria-expanded", "false");
    pickerMode = null;
    triggerEl?.focus();
  };

  const handleResultPick = (poiId) => {
    const mode = pickerMode;
    const trigger = mode === "from" ? toTriggerEl : (startId ? previewButtonEl : fromTriggerEl);
    closePickerAndFocus(trigger);
    if (mode === "from") setStart(poiId);
    if (mode === "to") setDestination(poiId);
  };

  const renderPickerResults = () => {
    if (!pickerResultsEl || !pickerMode) return;
    const matches = getPickerMatches();

    pickerResultsEl.innerHTML = "";
    if (pickerStatusEl) {
      const label = matches.length === 1 ? "result" : "results";
      pickerStatusEl.textContent = matches.length === 0 ? "No matches." : `${matches.length} ${label}.`;
    }

    if (matches.length === 0) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "picker-result picker-result--empty";
      emptyItem.textContent = "No matches";
      pickerResultsEl.appendChild(emptyItem);
      return;
    }

    matches.forEach((poi) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "picker-result";
      button.dataset.poiId = String(poi.value);

      const name = poi.displayName || poi.label || "Unknown";
      const category = poi.categoryName || "Location";
      const building = poi.buildingId ? `Building ${poi.buildingId}` : "";
      const floor = poi.floorId ? `Floor ${poi.floorId}` : "";
      const subtitle = [category, building, floor].filter(Boolean).join(" · ");
      const rating = getRatingDisplay(poi);
      const openLabel = poi.isOpen ? "Open" : "Closed";
      const openClass = poi.isOpen ? "picker-result__open" : "picker-result__closed";

      button.innerHTML = `
        <span class="picker-result__main">
          <span class="picker-result__name">${escapeHtml(name)}</span>
          <span class="picker-result__sub">${escapeHtml(subtitle)}</span>
        </span>
        <span class="picker-result__meta">
          ${rating ? `<span class="picker-result__rating">${escapeHtml(rating)}</span>` : ""}
          <span class="picker-result__status ${openClass}">${openLabel}</span>
        </span>
      `;

      const ariaParts = [name, category];
      if (poi.buildingId) ariaParts.push(`Building ${poi.buildingId}`);
      if (poi.floorId) ariaParts.push(`Floor ${poi.floorId}`);
      ariaParts.push(openLabel);
      button.setAttribute("aria-label", ariaParts.join(", "));

      button.addEventListener("click", () => handleResultPick(poi.value));

      item.appendChild(button);
      pickerResultsEl.appendChild(item);
    });
  };

  const openPicker = (mode) => {
    pickerMode = mode;
    if (pickerSearchEl) pickerSearchEl.value = "";
    resetPickerFilters();

    if (pickerSheetEl) {
      pickerSheetEl.hidden = false;
      pickerSheetEl.removeAttribute("aria-hidden");
    }
    fromTriggerEl?.setAttribute("aria-expanded", mode === "from" ? "true" : "false");
    toTriggerEl?.setAttribute("aria-expanded", mode === "to" ? "true" : "false");

    updatePickerLandscapeClass();
    sizePickerToMap();
    renderPickerResults();
    requestAnimationFrame(() => pickerSearchEl?.focus());
  };

  // -------- Event bindings --------
  const bindFilterEvents = () => {
    const controls = [filterBuildingEl, filterFloorEl, filterCategoryEl, filterTypeEl, filterOpenNowEl];
    controls.forEach((control) => {
      control?.addEventListener("change", () => {
        readFiltersFromControls();
        renderPickerResults();
      });
    });

    filterToggleEl?.addEventListener("click", toggleFilters);
  };

  const bindPickerEvents = () => {
    pickerSearchEl?.addEventListener("input", () => renderPickerResults());
    pickerSearchEl?.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closePickerAndFocus(getPickerDismissTarget());
      }
      if (event.key === "Enter") {
        const firstResult = pickerResultsEl?.querySelector(".picker-result:not(.picker-result--empty)");
        if (firstResult) firstResult.click();
      }
    });

    pickerCloseEl?.addEventListener("click", () => closePickerAndFocus(getPickerDismissTarget()));
    pickerSheetEl?.querySelector(".picker-sheet__backdrop")?.addEventListener("click", () => closePickerAndFocus(getPickerDismissTarget()));
  };

  const bindGlobalEvents = () => {
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && pickerSheetEl && !pickerSheetEl.hidden) {
        closePickerAndFocus(getPickerDismissTarget());
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
  };

  const bindSelectionEvents = () => {
    fromTriggerEl?.addEventListener("click", () => openPicker("from"));
    toTriggerEl?.addEventListener("click", () => openPicker("to"));
    clearButtonEl?.addEventListener("click", clearSelection);
    swapButtonEl?.addEventListener("click", swapSelection);
    previewButtonEl?.addEventListener("click", () => onPreview?.());
  };

  // -------- Initialization --------

  bindFilterEvents();
  bindPickerEvents();
  bindGlobalEvents();
  bindSelectionEvents();

  setupFilterControls();
  setupCategoryChips();
  if (fromSelectionEl) fromSelectionEl.textContent = "Search here";
  if (toSelectionEl) toSelectionEl.textContent = "Choose destination";
  updateButtons();
  notifySelectionChange();
}