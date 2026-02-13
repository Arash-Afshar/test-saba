// Initializes the search panel: building, floor, category, start, destination dropdowns, and preview button.
export function initSearchPanel({ hostId, buildingOptions, poiOptions, onSelectionChange, onPreview }) {
  const host = document.querySelector(hostId);
  const buildingSelect = host.querySelector("#buildingSelect");
  const floorSelect = host.querySelector("#floorSelect");
  const categorySelect = host.querySelector("#categorySelect");
  const startSelect = host.querySelector("#startSelect");
  const destinationCategorySelect = host.querySelector("#destinationCategorySelect");
  const endSelect = host.querySelector("#endSelect");
  const previewButton = host.querySelector("#previewButton");

  const populateSelect = (selectEl, options, placeholder) => {
    selectEl.innerHTML = "";
    const placeholderOption = document.createElement("option");
    placeholderOption.value = placeholder.value;
    placeholderOption.textContent = placeholder.label;
    selectEl.appendChild(placeholderOption);

    options.forEach((option) => {
      const opt = document.createElement("option");
      opt.value = option.value;
      opt.textContent = option.label;
      selectEl.appendChild(opt);
    });
  };

  // Shared compare for name sorting (used for start and destination).
  const compareByName = (a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" });

  // Building order: by id ascending.
  const getBuildingOptions = () =>
    buildingOptions.slice().sort((a, b) => Number(a.value) - Number(b.value));

  // Unique categories for the given building (for destination filter), sorted by name.
  const getDestinationCategoryOptions = (buildingId) => {
    if (!buildingId) return [];
    const inBuilding = poiOptions.filter((poi) => String(poi.buildingId) === String(buildingId));
    const byId = new Map();
    inBuilding.forEach((poi) => {
      if (poi.categoryId && poi.categoryName && !byId.has(poi.categoryId))
        byId.set(poi.categoryId, { value: poi.categoryId, label: poi.categoryName });
    });
    const byLabel = new Map();
    [...byId.values()].sort((a, b) => compareByName(a, b)).forEach((opt) => {
      if (!byLabel.has(opt.label)) byLabel.set(opt.label, opt);
    });
    return [...byLabel.values()].sort((a, b) => compareByName(a, b));
  };

  // Destination order: filter by buildingId, optional categoryId, then floor ascending, then name ascending. Dedupe by value (id).
  const getDestinationOptions = (buildingId, categoryId) => {
    let list = poiOptions.slice();
    if (buildingId) list = list.filter((poi) => String(poi.buildingId) === String(buildingId));
    if (categoryId) list = list.filter((poi) => String(poi.categoryId) === String(categoryId));
    const byValue = new Map();
    list.forEach((opt) => { if (!byValue.has(opt.value)) byValue.set(opt.value, opt); });
    return [...byValue.values()].sort((a, b) => {
      const byFloor = Number(a.floorId) - Number(b.floorId);
      return byFloor !== 0 ? byFloor : compareByName(a, b);
    });
  };

  // Returns unique floor options for the given building (from POIs).
  const getFloorOptionsForBuilding = (buildingId) => {
    if (!buildingId) return [];
    const floors = [...new Set(poiOptions.filter((poi) => String(poi.buildingId) === String(buildingId)).map((poi) => poi.floorId))];
    return floors.sort((a, b) => Number(a) - Number(b)).map((id) => ({ value: String(id), label: `Floor ${id}` }));
  };

  // Returns unique category options (poi_type) for the given building and floor, by id then by label to avoid duplicates, sorted by name.
  const getCategoryOptionsForBuildingAndFloor = (buildingId, floorId) => {
    if (!buildingId || !floorId) return [];
    const poisOnFloor = poiOptions.filter(
      (poi) => String(poi.buildingId) === String(buildingId) && String(poi.floorId) === String(floorId)
    );
    const byId = new Map();
    poisOnFloor.forEach((poi) => {
      if (poi.categoryId && poi.categoryName && !byId.has(poi.categoryId))
        byId.set(poi.categoryId, { value: poi.categoryId, label: poi.categoryName });
    });
    const byLabel = new Map();
    [...byId.values()].sort((a, b) => compareByName(a, b)).forEach((opt) => {
      if (!byLabel.has(opt.label)) byLabel.set(opt.label, opt);
    });
    return [...byLabel.values()].sort((a, b) => compareByName(a, b));
  };

  // Returns POI options for the given building, floor, and category, sorted by name ascending. Dedupe by value (id).
  const getStartOptionsForBuildingFloorAndCategory = (buildingId, floorId, categoryId) => {
    if (!buildingId || !floorId || !categoryId) return [];
    const list = poiOptions.filter(
      (poi) =>
        String(poi.buildingId) === String(buildingId) &&
        String(poi.floorId) === String(floorId) &&
        String(poi.categoryId) === String(categoryId)
    );
    const byValue = new Map();
    list.forEach((opt) => { if (!byValue.has(opt.value)) byValue.set(opt.value, opt); });
    return [...byValue.values()].sort(compareByName);
  };

  // Repopulates floor dropdown from selected building; floor, category, start; also destination category and destination by building.
  const updateFloorOptions = () => {
    const buildingId = buildingSelect.value;
    floorSelect.value = "";
    categorySelect.value = "";
    startSelect.value = "";
    destinationCategorySelect.value = "";
    endSelect.value = "";
    if (!buildingId) {
      floorSelect.disabled = true;
      categorySelect.disabled = true;
      startSelect.disabled = true;
      destinationCategorySelect.disabled = true;
      endSelect.disabled = true;
      populateSelect(floorSelect, [], { value: "", label: "Select floor" });
      populateSelect(categorySelect, [], { value: "", label: "Select start point category" });
      populateSelect(startSelect, [], { value: "", label: "Select start point" });
      populateSelect(destinationCategorySelect, [], destinationCategoryPlaceholder);
      populateSelect(endSelect, [], { value: "", label: "Select destination" });
    } else {
      floorSelect.disabled = false;
      const floorOptions = getFloorOptionsForBuilding(buildingId);
      populateSelect(floorSelect, floorOptions, { value: "", label: "Select floor" });
      categorySelect.disabled = true;
      populateSelect(categorySelect, [], { value: "", label: "Select start point category" });
      startSelect.disabled = true;
      populateSelect(startSelect, [], { value: "", label: "Select start point" });
      destinationCategorySelect.disabled = false;
      endSelect.disabled = false;
      populateSelect(destinationCategorySelect, getDestinationCategoryOptions(buildingId), destinationCategoryPlaceholder);
      populateSelect(endSelect, getDestinationOptions(buildingId, ""), { value: "", label: "Select destination" });
    }
    notifySelectionChange();
    updatePreviewState();
  };

  // Repopulates category dropdown from selected building and floor; clears category and start.
  const updateCategoryOptions = () => {
    const buildingId = buildingSelect.value;
    const floorId = floorSelect.value;
    categorySelect.value = "";
    startSelect.value = "";
    if (!buildingId || !floorId) {
      categorySelect.disabled = true;
      startSelect.disabled = true;
      populateSelect(categorySelect, [], { value: "", label: "Select start point category" });
      populateSelect(startSelect, [], { value: "", label: "Select start point" });
    } else {
      categorySelect.disabled = false;
      const categoryOptions = getCategoryOptionsForBuildingAndFloor(buildingId, floorId);
      populateSelect(categorySelect, categoryOptions, { value: "", label: "Select start point category" });
      startSelect.disabled = true;
      populateSelect(startSelect, [], { value: "", label: "Select start point" });
    }
    notifySelectionChange();
    updatePreviewState();
  };

  // Repopulates start dropdown from selected building, floor, and category.
  const updateStartOptions = () => {
    const buildingId = buildingSelect.value;
    const floorId = floorSelect.value;
    const categoryId = categorySelect.value;
    startSelect.value = "";
    if (!buildingId || !floorId || !categoryId) {
      startSelect.disabled = true;
      populateSelect(startSelect, [], { value: "", label: "Select start point" });
    } else {
      startSelect.disabled = false;
      const startOptions = getStartOptionsForBuildingFloorAndCategory(buildingId, floorId, categoryId);
      populateSelect(startSelect, startOptions, { value: "", label: "Select start point" });
    }
    notifySelectionChange();
    updatePreviewState();
  };

  const notifySelectionChange = () => {
    onSelectionChange?.({
      buildingId: buildingSelect.value,
      floorId: floorSelect.value,
      categoryId: categorySelect.value,
      startId: startSelect.value,
      endId: endSelect.value
    });
  };

  // Enables preview button only when destination (endId) is selected.
  const updatePreviewState = () => {
    const endId = endSelect.value;
    previewButton.disabled = !endId;
  };

  buildingSelect.addEventListener("change", () => updateFloorOptions());
  floorSelect.addEventListener("change", () => updateCategoryOptions());
  categorySelect.addEventListener("change", () => updateStartOptions());

  startSelect.addEventListener("change", () => {
    notifySelectionChange();
    updatePreviewState();
  });

  const destinationCategoryPlaceholder = { value: "", label: "Select destination category" };

  destinationCategorySelect.addEventListener("change", () => {
    const buildingId = buildingSelect.value;
    const categoryId = destinationCategorySelect.value;
    populateSelect(endSelect, getDestinationOptions(buildingId, categoryId), { value: "", label: "Select destination" });
    endSelect.value = "";
    notifySelectionChange();
    updatePreviewState();
  });

  endSelect.addEventListener("change", () => {
    notifySelectionChange();
    updatePreviewState();
  });

  previewButton.addEventListener("click", () => onPreview?.());

  // Initial population: building only; floor, category, start empty until building/floor/category chosen; destination category and destination empty until building chosen
  populateSelect(buildingSelect, getBuildingOptions(), { value: "", label: "Select building" });
  populateSelect(floorSelect, [], { value: "", label: "Select floor" });
  populateSelect(categorySelect, [], { value: "", label: "Select start point category" });
  populateSelect(startSelect, [], { value: "", label: "Select start point" });
  populateSelect(destinationCategorySelect, [], destinationCategoryPlaceholder);
  populateSelect(endSelect, [], { value: "", label: "Select destination" });
  floorSelect.disabled = true;
  categorySelect.disabled = true;
  startSelect.disabled = true;
  destinationCategorySelect.disabled = true;
  endSelect.disabled = true;

  updatePreviewState();

  // Returns methods to programmatically set start/destination -map click handlers.
  return {
    setStart: (poiId) => {
      const poi = poiOptions.find((p) => String(p.value) === String(poiId));
      if (!poi) return;
      // Set building, floor, category first, then start
      if (buildingSelect.value !== poi.buildingId) {
        buildingSelect.value = poi.buildingId;
        buildingSelect.dispatchEvent(new Event("change"));
      }
      // Wait for floor options to populate, then set floor
      setTimeout(() => {
        if (floorSelect.value !== poi.floorId) {
          floorSelect.value = poi.floorId;
          floorSelect.dispatchEvent(new Event("change"));
        }
        // Wait for category options to populate, then set category
        setTimeout(() => {
          if (categorySelect.value !== poi.categoryId) {
            categorySelect.value = poi.categoryId;
            categorySelect.dispatchEvent(new Event("change"));
          }
          // Finally set start
          setTimeout(() => {
            if (startSelect.options.length > 0) {
              startSelect.value = String(poiId);
              startSelect.dispatchEvent(new Event("change"));
            }
          }, 50);
        }, 50);
      }, 50);
    },
    setDestination: (poiId) => {
      const poi = poiOptions.find((p) => String(p.value) === String(poiId));
      if (!poi) return;
      // Set building first if needed, then destination
      if (buildingSelect.value !== poi.buildingId) {
        buildingSelect.value = poi.buildingId;
        buildingSelect.dispatchEvent(new Event("change"));
      }
      // Wait for destination options to populate, then set destination
      setTimeout(() => {
        if (endSelect.options.length > 0) {
          endSelect.value = String(poiId);
          endSelect.dispatchEvent(new Event("change"));
        }
      }, 50);
    },
    getCurrentSelection: () => ({
      buildingId: buildingSelect.value,
      floorId: floorSelect.value,
      categoryId: categorySelect.value,
      startId: startSelect.value,
      endId: endSelect.value
    })
  };
}