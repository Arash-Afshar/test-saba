async function bootstrap() {
  const searchPanelHost = document.querySelector("#searchPanel");
  const panelResponse = await fetch("./SearchPanel.html");
  searchPanelHost.innerHTML = await panelResponse.text();

  const response = await fetch("./data.json");
  const INDOOR_POIS = await response.json();
  const poiOptions = INDOOR_POIS.map((poi) => ({
    value: String(poi.id),
    label: `${poi.display_name} (Floor ${poi.floor_id})`
  }));

  const { initSearchPanel } = await import("./search-panel.js");
  initSearchPanel({
    hostId: "#searchPanel",
    poiOptions,
    onSelectionChange: () => null,
    onPreview: () => null
  });
}

bootstrap();
