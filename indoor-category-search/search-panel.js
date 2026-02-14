// Initializes the search panel: domain/type filters, searchable start/destination pickers, and preview button.
export function initSearchPanel({ hostId, buildingOptions, poiOptions, onSelectionChange, onPreview }) {
  // buildingOptions is currently unused (search-first UX), but kept for API compatibility.
  void buildingOptions;

  const host = document.querySelector(hostId);
  if (!host) return;

  const domainTypeChipsEl = host.querySelector("#domainTypeChips");
  const openNowToggleEl = host.querySelector("#openNowToggle");
  const scopingNoteEl = host.querySelector("#scopingNote");

  const startSearchEl = host.querySelector("#startSearch");
  const startResultsEl = host.querySelector("#startResults");
  const startStatusEl = host.querySelector("#startStatus");
  const startSelectionEl = host.querySelector("#startSelection");
  const clearStartButtonEl = host.querySelector("#clearStartButton");

  const endSearchEl = host.querySelector("#endSearch");
  const endResultsEl = host.querySelector("#endResults");
  const endStatusEl = host.querySelector("#endStatus");
  const endSelectionEl = host.querySelector("#endSelection");
  const clearEndButtonEl = host.querySelector("#clearEndButton");

  const swapButtonEl = host.querySelector("#swapButton");
  const previewButtonEl = host.querySelector("#previewButton");

  /** @type {string} "" means All */
  let selectedDomainType = "";
  let openNowOnly = false;

  /** @type {string} */
  let startId = "";
  /** @type {string} */
  let endId = "";

  const compareByName = (a, b) =>
    (a.displayName || a.label || "").localeCompare(b.displayName || b.label || "", undefined, {
      sensitivity: "base"
    });

  const getPoiById = (poiId) => poiOptions.find((p) => String(p.value) === String(poiId)) || null;

  const formatPoiSummary = (poi) => {
    if (!poi) return "";
    const name = poi.displayName || poi.label || "Unknown location";
    const building = poi.buildingId ? `Building ${poi.buildingId}` : "Building ?";
    const floor = poi.floorId ? `Floor ${poi.floorId}` : "Floor ?";
    const category = poi.categoryName ? poi.categoryName : "Location";
    return `${name} — ${building}, ${floor} • ${category}`;
  };

  // Builds a building adjacency graph from cross-building connector POIs.
  // A connector is considered cross-building when a CONNECTOR with the same displayName exists in 2+ buildings.
  const buildBuildingConnectorGraph = () => {
    /** @type {Map<string, Set<string>>} */
    const adjacency = new Map();

    const connectors = poiOptions.filter(
      (p) => String(p.categoryName || "").toUpperCase() === "CONNECTOR" && String(p.displayName || "").trim() !== ""
    );

    /** @type {Map<string, Set<string>>} */
    const byName = new Map();
    connectors.forEach((p) => {
      const name = String(p.displayName).trim();
      if (!byName.has(name)) byName.set(name, new Set());
      byName.get(name).add(String(p.buildingId));
    });

    const addEdge = (a, b) => {
      if (!adjacency.has(a)) adjacency.set(a, new Set());
      if (!adjacency.has(b)) adjacency.set(b, new Set());
      adjacency.get(a).add(b);
      adjacency.get(b).add(a);
    };

    byName.forEach((buildingIds) => {
      const ids = [...buildingIds];
      if (ids.length < 2) return;
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) addEdge(ids[i], ids[j]);
      }
    });

    return adjacency;
  };

  const connectorGraph = buildBuildingConnectorGraph();

  const getReachableBuildings = (startBuildingId) => {
    const start = String(startBuildingId || "");
    if (!start) return null;

    /** @type {Set<string>} */
    const visited = new Set([start]);
    /** @type {string[]} */
    const queue = [start];

    while (queue.length > 0) {
      const current = queue.shift();
      const neighbors = connectorGraph.get(current);
      if (!neighbors) continue;
      neighbors.forEach((n) => {
        if (!visited.has(n)) {
          visited.add(n);
          queue.push(n);
        }
      });
    }

    return visited;
  };

  const getAllowedBuildingsForEndpoint = (endpoint) => {
    // endpoint is "start" or "end"
    if (endpoint === "end") {
      const startPoi = getPoiById(startId);
      return startPoi ? getReachableBuildings(startPoi.buildingId) : null;
    }
    const endPoi = getPoiById(endId);
    return endPoi ? getReachableBuildings(endPoi.buildingId) : null;
  };

  const doesPoiMatchFilters = (poi, endpoint, query) => {
    if (!poi) return false;

    const q = String(query || "").trim().toLowerCase();
    if (q) {
      // Include building/floor so users can type numbers like "101" (Building 101) or "floor 2".
      const hay = `${poi.displayName || ""} ${poi.categoryName || ""} ${poi.domainType || ""} building ${
        poi.buildingId || ""
      } floor ${poi.floorId || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }

    if (selectedDomainType && String(poi.domainType) !== String(selectedDomainType)) return false;

    if (openNowOnly && poi.isOpen !== true) return false;

    const allowedBuildings = getAllowedBuildingsForEndpoint(endpoint);
    if (allowedBuildings && !allowedBuildings.has(String(poi.buildingId))) return false;

    return true;
  };

  const updateScopingNote = () => {
    if (!scopingNoteEl) return;

    if (startId) {
      const startPoi = getPoiById(startId);
      const allowed = getAllowedBuildingsForEndpoint("end");
      if (startPoi && allowed) {
        const buildings = [...allowed].sort((a, b) => Number(a) - Number(b));
        if (buildings.length === 1) {
          scopingNoteEl.textContent = `Destination is limited to Building ${buildings[0]} (no indoor connector to other buildings).`;
        } else {
          scopingNoteEl.textContent = `Destination is available in Buildings ${buildings.join(", ")}.`;
        }
        return;
      }
    }

    if (endId) {
      const endPoi = getPoiById(endId);
      const allowed = getAllowedBuildingsForEndpoint("start");
      if (endPoi && allowed) {
        const buildings = [...allowed].sort((a, b) => Number(a) - Number(b));
        if (buildings.length === 1) {
          scopingNoteEl.textContent = `Start is limited to Building ${buildings[0]} (no indoor connector to other buildings).`;
        } else {
          scopingNoteEl.textContent = `Start is available in Buildings ${buildings.join(", ")}.`;
        }
        return;
      }
    }

    scopingNoteEl.textContent = "";
  };

  const clearResults = (resultsEl, statusEl) => {
    if (resultsEl) resultsEl.innerHTML = "";
    if (statusEl) statusEl.textContent = "";
  };

  const renderResults = (endpoint) => {
    const isStart = endpoint === "start";
    const query = isStart ? startSearchEl.value : endSearchEl.value;
    const resultsEl = isStart ? startResultsEl : endResultsEl;
    const statusEl = isStart ? startStatusEl : endStatusEl;

    const matches = poiOptions
      .filter((p) => doesPoiMatchFilters(p, endpoint, query))
      .sort(compareByName)
      .slice(0, 12);

    if (!resultsEl) return;
    resultsEl.innerHTML = "";

    if (statusEl) {
      const count = matches.length;
      statusEl.textContent = count === 0 ? "No matches." : `${count} match${count === 1 ? "" : "es"}.`;
    }

    if (matches.length === 0) {
      const li = document.createElement("li");
      li.className = "results__empty";
      li.textContent = "No matches";
      resultsEl.appendChild(li);
      return;
    }

    matches.forEach((poi) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "result-item";
      btn.dataset.poiId = String(poi.value);
      btn.textContent = formatPoiSummary(poi);

      const openLabel = poi.isOpen ? "Open" : "Closed";
      btn.setAttribute(
        "aria-label",
        `${poi.displayName || "Location"}, Building ${poi.buildingId}, Floor ${poi.floorId}, ${poi.categoryName || "category"}, ${openLabel}`
      );

      btn.addEventListener("click", () => {
        if (isStart) {
          setStart(poi.value);
          // After selecting a start, the next common action is choosing a destination.
          endSearchEl?.focus?.();
        } else {
          setDestination(poi.value);
          // If a start is already selected, move to Preview; otherwise, prompt for start.
          (startId ? previewButtonEl : startSearchEl)?.focus?.();
        }
      });

      li.appendChild(btn);
      resultsEl.appendChild(li);
    });
  };

  const updateButtons = () => {
    const hasStart = Boolean(startId);
    const hasEnd = Boolean(endId);

    clearStartButtonEl.disabled = !hasStart;
    clearEndButtonEl.disabled = !hasEnd;
    swapButtonEl.disabled = !(hasStart && hasEnd);

    // Enable preview only when both points are selected.
    previewButtonEl.disabled = !(hasStart && hasEnd);
  };

  const notifySelectionChange = () => {
    onSelectionChange?.({
      startId,
      endId,
      domainType: selectedDomainType,
      openNowOnly
    });
  };

  const enforceIndoorScoping = () => {
    // If one endpoint is selected, the opposite endpoint must be in an allowed building.
    if (startId && endId) {
      const endPoi = getPoiById(endId);
      const allowedForEnd = getAllowedBuildingsForEndpoint("end");
      if (endPoi && allowedForEnd && !allowedForEnd.has(String(endPoi.buildingId))) {
        // Clear destination if it no longer matches indoor scoping.
        endId = "";
        endSelectionEl.textContent = "No destination selected";
        endSearchEl.value = "";
        clearResults(endResultsEl, endStatusEl);
      }

      const startPoi = getPoiById(startId);
      const allowedForStart = getAllowedBuildingsForEndpoint("start");
      if (startPoi && allowedForStart && !allowedForStart.has(String(startPoi.buildingId))) {
        startId = "";
        startSelectionEl.textContent = "No start selected";
        startSearchEl.value = "";
        clearResults(startResultsEl, startStatusEl);
      }
    }
  };

  const setStart = (poiId) => {
    const poi = getPoiById(poiId);
    if (!poi) return;
    startId = String(poi.value);
    startSelectionEl.textContent = formatPoiSummary(poi);
    startSearchEl.value = poi.displayName || "";
    clearResults(startResultsEl, startStatusEl);

    enforceIndoorScoping();
    updateScopingNote();
    updateButtons();
    notifySelectionChange();
  };

  const setDestination = (poiId) => {
    const poi = getPoiById(poiId);
    if (!poi) return;
    endId = String(poi.value);
    endSelectionEl.textContent = formatPoiSummary(poi);
    endSearchEl.value = poi.displayName || "";
    clearResults(endResultsEl, endStatusEl);

    enforceIndoorScoping();
    updateScopingNote();
    updateButtons();
    notifySelectionChange();
  };

  // Render domain/type chips.
  const domainTypes = [
    ...new Set(poiOptions.map((p) => String(p.domainType || "").trim()).filter((t) => t !== ""))
  ].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  const renderDomainChips = () => {
    if (!domainTypeChipsEl) return;
    domainTypeChipsEl.innerHTML = "";

    const createChip = (value, label) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.dataset.value = String(value);
      btn.setAttribute("aria-pressed", String(value) === String(selectedDomainType) ? "true" : "false");
      btn.textContent = label;
      btn.addEventListener("click", () => {
        selectedDomainType = String(value);
        // Update all pressed states.
        domainTypeChipsEl.querySelectorAll(".chip").forEach((chip) => {
          chip.setAttribute(
            "aria-pressed",
            String(chip.dataset.value) === String(selectedDomainType) ? "true" : "false"
          );
        });
        // Re-render results for the currently focused input.
        renderResults(document.activeElement === endSearchEl ? "end" : "start");
        // If current selections no longer match filters, keep them (filters affect lists only).
      });
      return btn;
    };

    domainTypeChipsEl.appendChild(createChip("", "All"));
    domainTypes.forEach((t) => domainTypeChipsEl.appendChild(createChip(t, t)));
  };

  renderDomainChips();

  // Wire up filters.
  openNowToggleEl?.addEventListener("change", () => {
    openNowOnly = Boolean(openNowToggleEl.checked);
    renderResults(document.activeElement === endSearchEl ? "end" : "start");
  });

  // Wire up search inputs.
  const attachSearchHandlers = (endpoint) => {
    const isStart = endpoint === "start";
    const inputEl = isStart ? startSearchEl : endSearchEl;
    const resultsEl = isStart ? startResultsEl : endResultsEl;
    const statusEl = isStart ? startStatusEl : endStatusEl;
    const pickerEl = inputEl?.closest?.(".picker") || null;

    if (!inputEl || !resultsEl) return;

    let hideTimer = null;

    const scheduleHide = () => {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        // Only hide if focus has fully left the picker (supports keyboard access to the results).
        if (pickerEl && pickerEl.contains(document.activeElement)) return;
        clearResults(resultsEl, statusEl);
      }, 150);
    };

    const cancelHide = () => {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = null;
    };

    inputEl.addEventListener("input", () => renderResults(endpoint));
    inputEl.addEventListener("focus", () => {
      cancelHide();
      renderResults(endpoint);
    });

    // Keep results visible while interacting (pointer + keyboard).
    if (pickerEl) {
      pickerEl.addEventListener("pointerdown", () => cancelHide());
      pickerEl.addEventListener("pointerup", () => scheduleHide());
      pickerEl.addEventListener("focusin", () => cancelHide());
      pickerEl.addEventListener("focusout", () => scheduleHide());
    }

    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const first = resultsEl.querySelector(".result-item");
        if (first) {
          e.preventDefault();
          first.click();
        }
      }
      if (e.key === "Escape") {
        clearResults(resultsEl, statusEl);
        inputEl.blur();
      }
    });
  };

  attachSearchHandlers("start");
  attachSearchHandlers("end");

  // Clear buttons.
  clearStartButtonEl?.addEventListener("click", () => {
    startId = "";
    startSelectionEl.textContent = "No start selected";
    startSearchEl.value = "";
    clearResults(startResultsEl, startStatusEl);
    updateScopingNote();
    updateButtons();
    notifySelectionChange();
  });

  clearEndButtonEl?.addEventListener("click", () => {
    endId = "";
    endSelectionEl.textContent = "No destination selected";
    endSearchEl.value = "";
    clearResults(endResultsEl, endStatusEl);
    updateScopingNote();
    updateButtons();
    notifySelectionChange();
  });

  // Swap button.
  swapButtonEl?.addEventListener("click", () => {
    if (!startId || !endId) return;
    const prevStart = startId;
    startId = endId;
    endId = prevStart;

    const startPoi = getPoiById(startId);
    const endPoi = getPoiById(endId);
    startSelectionEl.textContent = startPoi ? formatPoiSummary(startPoi) : "No start selected";
    endSelectionEl.textContent = endPoi ? formatPoiSummary(endPoi) : "No destination selected";
    startSearchEl.value = startPoi?.displayName || "";
    endSearchEl.value = endPoi?.displayName || "";

    updateScopingNote();
    updateButtons();
    notifySelectionChange();
  });

  // Preview button.
  previewButtonEl?.addEventListener("click", () => onPreview?.());

  // Initial state.
  startSelectionEl.textContent = "No start selected";
  endSelectionEl.textContent = "No destination selected";
  updateScopingNote();
  updateButtons();
  notifySelectionChange();

  // Returns methods to programmatically set start/destination from map clicks.
  return {
    setStart: (poiId) => setStart(poiId),
    setDestination: (poiId) => setDestination(poiId),
    getCurrentSelection: () => ({
      startId,
      endId,
      domainType: selectedDomainType,
      openNowOnly
    })
  };
}