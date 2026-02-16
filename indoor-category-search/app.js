// Loads panel HTML, POI data, and initializes the search panel and route preview.
async function bootstrap() {
  const searchPanelHost = document.querySelector("#searchPanel");
  const routePreviewHost = document.querySelector("#routePreview");

  // Load search panel HTML
  const panelResponse = await fetch("./SearchPanel.html", { cache: "no-store" });
  searchPanelHost.innerHTML = await panelResponse.text();

  // Load route preview HTML
  const routePreviewResponse = await fetch("./RoutePreview.html", { cache: "no-store" });
  routePreviewHost.innerHTML = await routePreviewResponse.text();

  const response = await fetch("./data.json", { cache: "no-store" });
  const INDOOR_POIS = await response.json();

  // Extracts indoor type from POI.data JSON string.
  const getDomainType = (poi) => {
    if (!poi?.data) return "";
    try {
      return String(JSON.parse(poi.data)?.TYPE ?? "");
    } catch {
      return "";
    }
  };

  // Unique building IDs for the building dropdown - panel sorts for display
  const buildingOptions = [...new Set(INDOOR_POIS.map((poi) => poi.building_id))].map((id) => ({
    value: String(id),
    label: `Building ${id}`
  }));
  // POI options with buildingId, floorId, and category for filtering
  const poiOptions = INDOOR_POIS.map((poi) => ({
    value: String(poi.id),
    label: `${poi.display_name} (Floor ${poi.floor_id})`,
    displayName: poi.display_name ?? "",
    buildingId: String(poi.building_id),
    floorId: String(poi.floor_id),
    categoryId: String(poi.poi_type?.id ?? ""),
    categoryName: poi.poi_type?.name ?? "",
    domainType: getDomainType(poi),
    isOpen: Boolean(poi.is_open),
    ratingData: poi.rating_data ?? null
  }));

  let currentSelection = {};
  let routePreview = null;

  // Initialize search panel
  const { initSearchPanel } = await import("./search-panel.js");
  const searchPanel = initSearchPanel({
    hostId: "#searchPanel",
    buildingOptions,
    poiOptions,
    onSelectionChange: (selection) => {
      currentSelection = selection;
      if (routePreview) {
        routePreview.updateRoutePreview(selection, INDOOR_POIS, false); // Show map
      }
    },
    onPreview: () => {
      if (routePreview) {
        routePreview.updateRoutePreview(currentSelection, INDOOR_POIS, true); // Show route line
      }
    }
  });

  // Initialize route preview
  const { initRoutePreview } = await import("./route-preview.js");
  routePreview = initRoutePreview({
    hostId: "#routePreview"
  });
}

bootstrap();