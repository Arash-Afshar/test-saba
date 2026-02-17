async function bootstrap() {
  const searchPanelHost = document.querySelector("#searchPanel");
  const panelResponse = await fetch("./SearchPanel.html");
  searchPanelHost.innerHTML = await panelResponse.text();

  const routePreviewHost = document.querySelector("#routePreview");
  const routePreviewResponse = await fetch("./RoutePreview.html");
  routePreviewHost.innerHTML = await routePreviewResponse.text();

  const response = await fetch("./data.json");
  const INDOOR_POIS = await response.json();

  const getDomainType = (poi) => {
    if (!poi?.data) return "";
    try {
      return String(JSON.parse(poi.data)?.TYPE ?? "");
    } catch {
      return "";
    }
  };

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

  const { initSearchPanel } = await import("./search-panel.js");
  initSearchPanel({
    hostId: "#searchPanel",
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

  const { initRoutePreview } = await import("./route-preview.js");
  routePreview = initRoutePreview({
    hostId: "#routePreview"
  });
}

bootstrap();
