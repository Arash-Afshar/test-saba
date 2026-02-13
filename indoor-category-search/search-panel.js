// Initializes the search panel: From/To location pickers (search-first), filters, and preview button.
export function initSearchPanel({ hostId, poiData, onSelectionChange, onPreview }) {
  const host = document.querySelector(hostId);
  if (!host) return;

  const startTrigger = host.querySelector("#startTrigger");
  const endTrigger = host.querySelector("#endTrigger");
  const swapButton = host.querySelector("#swapButton");
  const clearButton = host.querySelector("#clearButton");
  const previewButton = host.querySelector("#previewButton");

  const startTriggerTitle = host.querySelector("#startTriggerTitle");
  const startTriggerMeta = host.querySelector("#startTriggerMeta");
  const endTriggerTitle = host.querySelector("#endTriggerTitle");
  const endTriggerMeta = host.querySelector("#endTriggerMeta");

  const liveRegion = host.querySelector("#routeLiveRegion");

  const overlay = host.querySelector("#locationPickerOverlay");
  const dialog = host.querySelector("#locationPickerDialog");
  const pickerCloseButton = host.querySelector("#pickerCloseButton");
  const pickerTitle = host.querySelector("#pickerTitle");
  const pickerSearchInput = host.querySelector("#pickerSearchInput");
  const quickChipsHost = host.querySelector("#pickerQuickChips");

  const filterBuildingSelect = host.querySelector("#filterBuildingSelect");
  const filterFloorSelect = host.querySelector("#filterFloorSelect");
  const filterCategorySelect = host.querySelector("#filterCategorySelect");
  const filterTypeSelect = host.querySelector("#filterTypeSelect");
  const filterOpenNow = host.querySelector("#filterOpenNow");
  const resetFiltersButton = host.querySelector("#resetFiltersButton");
  const filterDetails = host.querySelector(".picker-filters");

  const resultsCountEl = host.querySelector("#pickerResultsCount");
  const noResultsEl = host.querySelector("#pickerNoResults");
  const resultsListEl = host.querySelector("#pickerResultsList");

  const compareText = (a, b) => a.localeCompare(b, undefined, { sensitivity: "base" });

  const normalizeForSearch = (value) =>
    String(value ?? "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  const tokenizeQuery = (query) =>
    normalizeForSearch(query)
      .split(" ")
      .filter(Boolean);

  // Parses POI "data" JSON string and returns TYPE
  const getDataType = (poi) => {
    if (!poi?.data) return "";
    try {
      const parsed = JSON.parse(poi.data);
      return parsed?.TYPE ? String(parsed.TYPE) : "";
    } catch {
      return "";
    }
  };

  const toPoiRecord = (poi) => {
    const id = poi?.id ?? "";
    return {
      id: String(id),
      name: String(poi?.display_name ?? ""),
      address: String(poi?.address ?? ""),
      buildingId: String(poi?.building_id ?? ""),
      floorId: String(poi?.floor_id ?? ""),
      category: String(poi?.poi_type?.name ?? ""),
      type: getDataType(poi),
      isOpen: Boolean(poi?.is_open),
      ratingAvg: String(poi?.rating_data?.["ratings-average"] ?? ""),
      ratingCount: String(poi?.rating_data?.["reviews-count"] ?? ""),
      searchText: "" // filled after construction
    };
  };

  const buildSearchText = (record) => {
    const openText = record.isOpen ? "open" : "closed";
    return normalizeForSearch(
      [
        record.name,
        record.address,
        record.category,
        record.type,
        `building ${record.buildingId}`,
        `floor ${record.floorId}`,
        record.buildingId,
        record.floorId,
        openText
      ].join(" ")
    );
  };

  const pois = Array.isArray(poiData) ? poiData : [];
  const poiRecords = pois
    .map(toPoiRecord)
    .filter((p) => p.id && p.name)
    .map((p) => ({ ...p, searchText: buildSearchText(p) }));
  const poiById = new Map(poiRecords.map((p) => [p.id, p]));

  // Picker state + selection state
  let selection = { startId: "", endId: "" };
  let pickerState = {
    isOpen: false,
    activeField: "start",
    query: "",
    filters: {
      buildingId: "",
      floorId: "",
      category: "",
      type: "",
      openNow: false
    }
  };

  let restoreFocusEl = null;

  const announce = (message) => {
    if (!liveRegion) return;
    liveRegion.textContent = "";
    // Small delay helps some screen readers announce updates reliably.
    setTimeout(() => {
      liveRegion.textContent = message;
    }, 10);
  };

  const getPoiMetaText = (poi) => {
    if (!poi) return "";
    const parts = [];
    if (poi.category) parts.push(poi.category);
    if (poi.buildingId) parts.push(`Building ${poi.buildingId}`);
    if (poi.floorId) parts.push(`Floor ${poi.floorId}`);
    parts.push(poi.isOpen ? "Open" : "Closed");
    return parts.join(" · ");
  };

  const renderRouteTriggers = () => {
    const startPoi = selection.startId ? poiById.get(String(selection.startId)) : null;
    const endPoi = selection.endId ? poiById.get(String(selection.endId)) : null;

    if (startTriggerTitle) startTriggerTitle.textContent = startPoi ? startPoi.name : "Choose start";
    if (startTriggerMeta) startTriggerMeta.textContent = startPoi ? getPoiMetaText(startPoi) : " ";

    if (endTriggerTitle) endTriggerTitle.textContent = endPoi ? endPoi.name : "Choose destination";
    if (endTriggerMeta) endTriggerMeta.textContent = endPoi ? getPoiMetaText(endPoi) : " ";
  };

  const updateActionButtons = () => {
    const hasStart = Boolean(selection.startId);
    const hasEnd = Boolean(selection.endId);
    if (previewButton) previewButton.disabled = !(hasStart && hasEnd);
    if (swapButton) swapButton.disabled = !(hasStart && hasEnd);
    if (clearButton) clearButton.disabled = !(hasStart || hasEnd);
  };

  const notifySelectionChange = () => {
    onSelectionChange?.({ startId: selection.startId, endId: selection.endId });
  };

  const populateSelect = (selectEl, options, placeholderLabel) => {
    if (!selectEl) return;
    selectEl.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = placeholderLabel;
    selectEl.appendChild(placeholder);

    options.forEach((opt) => {
      const optionEl = document.createElement("option");
      optionEl.value = opt.value;
      optionEl.textContent = opt.label;
      selectEl.appendChild(optionEl);
    });
  };

  const uniqueSorted = (values, sortFn) => {
    const set = new Set(values.filter((v) => v !== null && v !== undefined && String(v).trim() !== ""));
    return [...set].map((v) => String(v)).sort(sortFn);
  };

  const getBuildingOptions = () => {
    const buildings = uniqueSorted(poiRecords.map((p) => p.buildingId), (a, b) => Number(a) - Number(b));
    return buildings.map((id) => ({ value: id, label: `Building ${id}` }));
  };

  const getFloorOptions = (buildingId) => {
    const inBuilding = buildingId
      ? poiRecords.filter((p) => String(p.buildingId) === String(buildingId))
      : poiRecords;
    const floors = uniqueSorted(inBuilding.map((p) => p.floorId), (a, b) => Number(a) - Number(b));
    return floors.map((id) => ({ value: id, label: `Floor ${id}` }));
  };

  const getCategoryOptions = ({ buildingId, floorId } = {}) => {
    let list = poiRecords.slice();
    if (buildingId) list = list.filter((p) => String(p.buildingId) === String(buildingId));
    if (floorId) list = list.filter((p) => String(p.floorId) === String(floorId));
    const categories = uniqueSorted(list.map((p) => p.category), compareText);
    return categories.map((name) => ({ value: name, label: name }));
  };

  const getTypeOptions = ({ buildingId, floorId, category } = {}) => {
    let list = poiRecords.slice();
    if (buildingId) list = list.filter((p) => String(p.buildingId) === String(buildingId));
    if (floorId) list = list.filter((p) => String(p.floorId) === String(floorId));
    if (category) list = list.filter((p) => String(p.category) === String(category));
    const types = uniqueSorted(list.map((p) => p.type), compareText);
    return types.map((t) => ({ value: t, label: t }));
  };

  const syncFilterControlsFromState = () => {
    if (filterBuildingSelect) filterBuildingSelect.value = pickerState.filters.buildingId;
    if (filterFloorSelect) filterFloorSelect.value = pickerState.filters.floorId;
    if (filterCategorySelect) filterCategorySelect.value = pickerState.filters.category;
    if (filterTypeSelect) filterTypeSelect.value = pickerState.filters.type;
    if (filterOpenNow) filterOpenNow.checked = Boolean(pickerState.filters.openNow);
  };

  const refreshFilterOptions = () => {
    const prev = { ...pickerState.filters };

    populateSelect(filterBuildingSelect, getBuildingOptions(), "Any building");

    populateSelect(filterFloorSelect, getFloorOptions(prev.buildingId), "Any floor");

    populateSelect(
      filterCategorySelect,
      getCategoryOptions({ buildingId: prev.buildingId, floorId: prev.floorId }),
      "Any category"
    );

    populateSelect(
      filterTypeSelect,
      getTypeOptions({ buildingId: prev.buildingId, floorId: prev.floorId, category: prev.category }),
      "Any type"
    );

    // If previously selected values are no longer present, clear them.
    const hasOptionValue = (selectEl, value) =>
      selectEl && value
        ? [...selectEl.options].some((o) => String(o.value) === String(value))
        : true;

    if (!hasOptionValue(filterFloorSelect, prev.floorId)) pickerState.filters.floorId = "";
    if (!hasOptionValue(filterCategorySelect, prev.category)) pickerState.filters.category = "";
    if (!hasOptionValue(filterTypeSelect, prev.type)) pickerState.filters.type = "";

    syncFilterControlsFromState();
    updateQuickChipSelection();
  };

  const QUICK_CATEGORY_SPECS = [
    { key: "ENTRANCE", label: "Entrances" },
    { key: "WASHROOM", label: "Washrooms" },
    { key: "ELEVATOR", label: "Elevators" },
    { key: "INFORMATION", label: "Info" },
    { key: "FOOD", label: "Food" }
  ];

  const buildQuickChips = () => {
    if (!quickChipsHost) return;
    quickChipsHost.innerHTML = "";

    const available = new Set(poiRecords.map((p) => p.category));
    const chipsToShow = QUICK_CATEGORY_SPECS.filter((c) => available.has(c.key));

    chipsToShow.forEach((chip) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.dataset.categoryValue = chip.key;
      btn.textContent = chip.label;
      btn.addEventListener("click", () => {
        const next = pickerState.filters.category === chip.key ? "" : chip.key;
        pickerState.filters.category = next;
        if (filterCategorySelect) filterCategorySelect.value = next;
        refreshFilterOptions();
        renderResults();
      });
      quickChipsHost.appendChild(btn);
    });
  };

  function updateQuickChipSelection() {
    if (!quickChipsHost) return;
    const selected = pickerState.filters.category;
    [...quickChipsHost.querySelectorAll("button.chip")].forEach((btn) => {
      const value = btn.dataset.categoryValue || "";
      btn.classList.toggle("chip--selected", value && String(value) === String(selected));
      btn.setAttribute("aria-pressed", value && String(value) === String(selected) ? "true" : "false");
    });
  }

  const matchesQuery = (poi, query) => {
    const tokens = tokenizeQuery(query);
    if (tokens.length === 0) return true;
    return tokens.every((t) => poi.searchText.includes(t));
  };

  const getQueryRank = (poi, query) => {
    const q = normalizeForSearch(query);
    if (!q) return 0;

    const name = normalizeForSearch(poi.name);
    const address = normalizeForSearch(poi.address);
    const category = normalizeForSearch(poi.category);
    const type = normalizeForSearch(poi.type);
    const buildingId = normalizeForSearch(poi.buildingId);
    const floorId = normalizeForSearch(poi.floorId);

    if (name.startsWith(q)) return 0;
    if (name.includes(q)) return 1;
    if (category.includes(q)) return 2;
    if (type.includes(q)) return 3;
    if (q === buildingId || `building ${buildingId}`.includes(q)) return 4;
    if (q === floorId || `floor ${floorId}`.includes(q)) return 5;
    if (address.includes(q)) return 6;
    if (poi.searchText.includes(q)) return 7;
    return 8;
  };

  const getFilteredPois = () => {
    const q = pickerState.query || "";
    const f = pickerState.filters;

    let list = poiRecords.slice();
    if (q) list = list.filter((p) => matchesQuery(p, q));
    if (f.buildingId) list = list.filter((p) => String(p.buildingId) === String(f.buildingId));
    if (f.floorId) list = list.filter((p) => String(p.floorId) === String(f.floorId));
    if (f.category) list = list.filter((p) => String(p.category) === String(f.category));
    if (f.type) list = list.filter((p) => String(p.type) === String(f.type));
    if (f.openNow) list = list.filter((p) => p.isOpen);

    list.sort((a, b) => {
      const rankA = getQueryRank(a, q);
      const rankB = getQueryRank(b, q);
      if (rankA !== rankB) return rankA - rankB;
      const byBuilding = Number(a.buildingId) - Number(b.buildingId);
      if (byBuilding !== 0) return byBuilding;
      const byFloor = Number(a.floorId) - Number(b.floorId);
      if (byFloor !== 0) return byFloor;
      return compareText(a.name, b.name);
    });

    return list;
  };

  const renderResults = () => {
    if (!resultsListEl || !resultsCountEl || !noResultsEl) return;

    const results = getFilteredPois();

    resultsCountEl.textContent = `${results.length} result${results.length === 1 ? "" : "s"}`;
    noResultsEl.hidden = results.length !== 0;

    resultsListEl.innerHTML = "";
    results.forEach((poi) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "result-item";
      button.dataset.poiId = poi.id;
      button.setAttribute("role", "listitem");

      const main = document.createElement("div");
      main.className = "result-main";

      const nameEl = document.createElement("div");
      nameEl.className = "result-name";
      nameEl.textContent = poi.name;

      const metaEl = document.createElement("div");
      metaEl.className = "result-meta";
      metaEl.textContent = `${poi.category || "Other"} · Building ${poi.buildingId} · Floor ${poi.floorId}`;

      main.appendChild(nameEl);
      main.appendChild(metaEl);

      const side = document.createElement("div");
      side.className = "result-side";

      const status = document.createElement("div");
      status.className = `result-status ${poi.isOpen ? "result-status--open" : "result-status--closed"}`;
      status.textContent = poi.isOpen ? "Open" : "Closed";

      side.appendChild(status);
      button.appendChild(main);
      button.appendChild(side);

      button.addEventListener("click", () => {
        try {
          if (pickerState.activeField === "start") {
            selection.startId = poi.id;
            announce(`Start set to ${poi.name}.`);
          } else {
            selection.endId = poi.id;
            announce(`Destination set to ${poi.name}.`);
          }

          renderRouteTriggers();
          updateActionButtons();

          // Close first so selection-change side effects can't block dismissal.
          closePicker();
          notifySelectionChange();
        } finally {
          // Ensure the dialog is dismissed even if selection-change code throws.
          closePicker();
        }
      });

      resultsListEl.appendChild(button);
    });
  };

  const getFocusableInDialog = () => {
    if (!dialog) return [];
    const selectors = [
      "button:not([disabled])",
      "a[href]",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])"
    ];
    return [...dialog.querySelectorAll(selectors.join(","))].filter((el) => {
      const style = window.getComputedStyle(el);
      return style.visibility !== "hidden" && style.display !== "none";
    });
  };

  const trapFocus = (e) => {
    const focusable = getFocusableInDialog();
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const onDialogKeyDown = (e) => {
    if (!pickerState.isOpen) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closePicker();
      return;
    }
    if (e.key === "Tab") {
      trapFocus(e);
    }
  };

  const openPicker = (field) => {
    if (!overlay || !dialog || !pickerTitle || !pickerSearchInput) return;
    pickerState.isOpen = true;
    pickerState.activeField = field;
    pickerState.query = "";

    // Reset search + filters each open so the list shows everything by default.
    pickerSearchInput.value = "";
    pickerState.filters = { buildingId: "", floorId: "", category: "", type: "", openNow: false };
    if (filterDetails) filterDetails.open = false;

    restoreFocusEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    pickerTitle.textContent = field === "start" ? "Choose start location" : "Choose destination";

    overlay.hidden = false;
    document.body.style.overflow = "hidden";

    refreshFilterOptions();
    renderResults();

    document.addEventListener("keydown", onDialogKeyDown, true);
    requestAnimationFrame(() => pickerSearchInput.focus());
  };

  const closePicker = () => {
    if (!overlay) return;
    if (!pickerState.isOpen) return;
    pickerState.isOpen = false;
    overlay.hidden = true;
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onDialogKeyDown, true);
    if (restoreFocusEl && typeof restoreFocusEl.focus === "function") {
      restoreFocusEl.focus();
    }
    restoreFocusEl = null;
  };

  // Hook up UI events
  startTrigger?.addEventListener("click", () => openPicker("start"));
  endTrigger?.addEventListener("click", () => openPicker("end"));
  pickerCloseButton?.addEventListener("click", () => closePicker());

  overlay?.addEventListener("click", (e) => {
    if (e.target === overlay) closePicker();
  });

  pickerSearchInput?.addEventListener("input", () => {
    pickerState.query = pickerSearchInput.value || "";
    renderResults();
  });

  filterBuildingSelect?.addEventListener("change", () => {
    pickerState.filters.buildingId = filterBuildingSelect.value;
    // Changing building can invalidate floor/category/type selections
    refreshFilterOptions();
    renderResults();
  });

  filterFloorSelect?.addEventListener("change", () => {
    pickerState.filters.floorId = filterFloorSelect.value;
    refreshFilterOptions();
    renderResults();
  });

  filterCategorySelect?.addEventListener("change", () => {
    pickerState.filters.category = filterCategorySelect.value;
    refreshFilterOptions();
    renderResults();
  });

  filterTypeSelect?.addEventListener("change", () => {
    pickerState.filters.type = filterTypeSelect.value;
    refreshFilterOptions();
    renderResults();
  });

  filterOpenNow?.addEventListener("change", () => {
    pickerState.filters.openNow = Boolean(filterOpenNow.checked);
    renderResults();
  });

  resetFiltersButton?.addEventListener("click", () => {
    pickerState.filters = { buildingId: "", floorId: "", category: "", type: "", openNow: false };
    refreshFilterOptions();
    renderResults();
    announce("Filters reset.");
  });

  swapButton?.addEventListener("click", () => {
    const next = { startId: selection.endId, endId: selection.startId };
    selection = next;
    renderRouteTriggers();
    updateActionButtons();
    notifySelectionChange();
    announce("Start and destination swapped.");
  });

  clearButton?.addEventListener("click", () => {
    selection = { startId: "", endId: "" };
    renderRouteTriggers();
    updateActionButtons();
    notifySelectionChange();
    announce("Route cleared.");
  });

  previewButton?.addEventListener("click", () => {
    if (!selection.startId || !selection.endId) return;
    onPreview?.();
  });

  // Initial render
  if (overlay) overlay.hidden = true;
  buildQuickChips();
  refreshFilterOptions();
  renderRouteTriggers();
  updateActionButtons();
  notifySelectionChange();

  // API used by map click handlers.
  return {
    setStart: (poiId) => {
      const id = String(poiId);
      if (!poiById.has(id)) return;
      selection.startId = id;
      renderRouteTriggers();
      updateActionButtons();
      notifySelectionChange();
      announce(`Start set to ${poiById.get(id)?.name ?? "selected location"}.`);
      if (pickerState.isOpen) closePicker();
    },
    setDestination: (poiId) => {
      const id = String(poiId);
      if (!poiById.has(id)) return;
      selection.endId = id;
      renderRouteTriggers();
      updateActionButtons();
      notifySelectionChange();
      announce(`Destination set to ${poiById.get(id)?.name ?? "selected location"}.`);
      if (pickerState.isOpen) closePicker();
    },
    getCurrentSelection: () => ({ startId: selection.startId, endId: selection.endId })
  };
}