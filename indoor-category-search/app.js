// Loads panel HTML, POI data, and initializes the search panel and route preview.
async function bootstrap() {
  const searchPanelHost = document.querySelector("#searchPanel");
  const routePreviewHost = document.querySelector("#routePreview");
  const cacheBust = `v=${Date.now()}`;

  // Load search panel HTML
  const panelResponse = await fetch(`./SearchPanel.html?${cacheBust}`, { cache: "no-store" });
  searchPanelHost.innerHTML = await panelResponse.text();

  // Load route preview HTML
  const routePreviewResponse = await fetch(`./RoutePreview.html?${cacheBust}`, { cache: "no-store" });
  routePreviewHost.innerHTML = await routePreviewResponse.text();

  const response = await fetch(`./data.json?${cacheBust}`, { cache: "no-store" });
  const INDOOR_POIS = await response.json();

  let currentSelection = { startId: "", endId: "" };
  let searchPanel = null;
  let routePreview = null;

  // Initialize route preview first (search panel calls onSelectionChange during init)
  const { initRoutePreview } = await import(`./route-preview.js?${cacheBust}`);
  routePreview = initRoutePreview({
    hostId: "#routePreview",
    onPoiClick: (poiId) => {
      if (!searchPanel) return;
      const selection = searchPanel.getCurrentSelection();
      if (!selection.startId) {
        searchPanel.setStart(poiId);
      } else {
        searchPanel.setDestination(poiId);
      }
    }
  });

  // Initialize search panel
  const { initSearchPanel } = await import(`./search-panel.js?${cacheBust}`);
  searchPanel = initSearchPanel({
    hostId: "#searchPanel",
    poiData: INDOOR_POIS,
    onSelectionChange: (selection) => {
      currentSelection = selection;
      routePreview?.updateRoutePreview(selection, INDOOR_POIS, false); // Show map
    },
    onPreview: () => {
      routePreview?.updateRoutePreview(currentSelection, INDOOR_POIS, true); // Show route line
    }
  });
}

bootstrap();