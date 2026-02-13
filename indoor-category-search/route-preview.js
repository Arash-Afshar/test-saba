// Initializes the route preview panel - displays route info and floor map visualization.
export function initRoutePreview({ hostId, onPoiClick }) {
  const host = document.querySelector(hostId);
  if (!host) return;

  const startNameEl = host.querySelector("#startName");
  const startDetailsEl = host.querySelector("#startDetails");
  const endNameEl = host.querySelector("#endName");
  const endDetailsEl = host.querySelector("#endDetails");
  const distanceValueEl = host.querySelector("#distanceValue");
  const routeSummaryEl = host.querySelector("#routeSummary");
  const floorMapEl = host.querySelector("#floorMap");
  const poiTooltipEl = host.querySelector("#poiTooltip");
  
  // Timeout for hiding tooltip - allows smooth transition from POI to tooltip
  let tooltipHideTimeout = null;

  // Parses POI "data" JSON string and returns TYPE
  const getDataType = (poi) => {
    if (!poi.data) return "";
    try {
      const parsed = JSON.parse(poi.data);
      return parsed.TYPE || "";
    } catch {
      return "";
    }
  };

  // Formats working hours JSON string into readable text
  const formatWorkingHours = (workingHoursStr) => {
    if (!workingHoursStr) return "";
    try {
      const parsed = JSON.parse(workingHoursStr);
      const hours = parsed.working_hours || [];
      if (hours.length === 0) return "";
      return hours.map((h) => `${h.day}: ${h.open}-${h.close}`).join(", ");
    } catch {
      return "";
    }
  };

  // Formats rating data into readable text
  const formatRating = (ratingData) => {
    if (!ratingData) return "";
    const avg = ratingData["ratings-average"] || "";
    const count = ratingData["reviews-count"] || "";
    if (!avg && !count) return "";
    if (!avg) return `${count} reviews`;
    if (!count) return `${avg} ⭐`;
    return `${avg} ⭐ (${count} reviews)`;
  };

  // Shows tooltip with POI details at specified position - screen coordinates
  const showPoiTooltip = (poi, screenX, screenY) => {
    if (!poiTooltipEl || !floorMapEl) return;
    
    const parts = [];
    
    // Add website if it exists and is not empty (priority 1)
    if (poi.website && poi.website.trim() !== "") {
      const websiteUrl = poi.website.trim();
      // Ensure URL has protocol
      const href = websiteUrl.startsWith("http://") || websiteUrl.startsWith("https://") 
        ? websiteUrl 
        : `https://${websiteUrl}`;
      parts.push(`<div class="tooltip-row"><strong>Website:</strong> <a href="${href}" target="_blank" rel="noopener noreferrer" class="tooltip-link">${poi.website}</a></div>`);
    }
    
    // Add working hours if they exist (priority 2)
    const workingHours = formatWorkingHours(poi.working_hours);
    if (workingHours) {
      parts.push(`<div class="tooltip-row"><strong>Hours:</strong> ${workingHours}</div>`);
    }
    
    // Add rating if it exists (priority 3)
    const rating = formatRating(poi.rating_data);
    if (rating) {
      parts.push(`<div class="tooltip-row"><strong>Rating:</strong> ${rating}</div>`);
    }
    
    // Add is_open status if it exists (priority 4)
    if (poi.is_open !== undefined && poi.is_open !== null) {
      parts.push(`<div class="tooltip-row"><strong>Status:</strong> ${poi.is_open ? "Open" : "Closed"}</div>`);
    }
    
    // Only show tooltip if there's content to display
    if (parts.length === 0) return;
    
    // Get image URL if available
    const imageUrl = poi.images && poi.images.length > 0 && poi.images[0].url ? poi.images[0].url : null;
    const imageHtml = imageUrl ? `<img src="${imageUrl}" alt="${poi.display_name}" class="tooltip-image" />` : "";
    
    poiTooltipEl.innerHTML = `
      ${imageHtml}
      <div class="tooltip-content">
        <div class="tooltip-title">${poi.display_name}</div>
        ${parts.join("")}
      </div>
    `;
    
    // Position tooltip relative to map container - which has position: relative
    const container = floorMapEl.parentElement;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    
    // Calculate tooltip dimensions (approximate)
    const tooltipWidth = 280; // max-width from CSS
    const tooltipHeight = 100; // approximate height
    
    // Position tooltip to the right of the POI marker with offset
    // POI marker radius is typically 5-8px, so offset by at least 20px to avoid overlap
    const offsetX = 25; // Horizontal offset from POI center
    const offsetY = -tooltipHeight / 2; // Center vertically with POI
    
    let tooltipX = screenX - containerRect.left + offsetX;
    let tooltipY = screenY - containerRect.top + offsetY;
    
    // If tooltip would go off the right edge, position it to the left instead
    if (tooltipX + tooltipWidth > containerRect.width - 10) {
      tooltipX = screenX - containerRect.left - tooltipWidth - offsetX;
    }
    
    // If tooltip would go off the left edge, keep it on the right but adjust
    if (tooltipX < 10) {
      tooltipX = screenX - containerRect.left + offsetX;
    }
    
    // Ensure tooltip stays within vertical bounds
    if (tooltipY < 10) {
      tooltipY = 10;
    }
    if (tooltipY + tooltipHeight > containerRect.height - 10) {
      tooltipY = containerRect.height - tooltipHeight - 10;
    }
    
    poiTooltipEl.style.left = `${tooltipX}px`;
    poiTooltipEl.style.top = `${tooltipY}px`;
    poiTooltipEl.style.display = "flex";
  };

  // Hides POI tooltip with optional delay
  const hidePoiTooltip = (delay = 0) => {
    if (tooltipHideTimeout) {
      clearTimeout(tooltipHideTimeout);
      tooltipHideTimeout = null;
    }
    if (delay > 0) {
      tooltipHideTimeout = setTimeout(() => {
        if (poiTooltipEl) poiTooltipEl.style.display = "none";
        tooltipHideTimeout = null;
      }, delay);
    } else {
      if (poiTooltipEl) poiTooltipEl.style.display = "none";
    }
  };

  // Cancels any pending tooltip hide
  const cancelTooltipHide = () => {
    if (tooltipHideTimeout) {
      clearTimeout(tooltipHideTimeout);
      tooltipHideTimeout = null;
    }
  };
  
  // Add hover handlers to tooltip element to keep it visible when hovering over it
  if (poiTooltipEl) {
    poiTooltipEl.addEventListener("mouseenter", () => {
      cancelTooltipHide();
    });
    poiTooltipEl.addEventListener("mouseleave", () => {
      hidePoiTooltip(100); // Small delay when leaving tooltip
    });
  }

  // Returns true if there is an ACCESS POI with the same display_name on both floor A and floor B in the same building.
  const hasAccessConnectorBetweenFloors = (poiData, buildingId, floorA, floorB) => {
    const accessOnFloorA = poiData.filter(
      (p) =>
        String(p.building_id) === String(buildingId) &&
        p.floor_id === floorA &&
        getDataType(p) === "ACCESS"
    );
    const accessOnFloorB = poiData.filter(
      (p) =>
        String(p.building_id) === String(buildingId) &&
        p.floor_id === floorB &&
        getDataType(p) === "ACCESS"
    );
    const namesA = new Set(accessOnFloorA.map((p) => p.display_name));
    return accessOnFloorB.some((p) => namesA.has(p.display_name));
  };

  // Calculates distance between two lat/long points using Euclidean distance (meters).
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    // Convert degrees to approximate meters (1 degree latitude ≈ 111,000m, longitude varies by latitude)
    // For Edmonton area (~53°N), 1 degree longitude ≈ 66,000m
    const latMeters = (lat2 - lat1) * 111000;
    const lonMeters = (lon2 - lon1) * 66000;
    // Euclidean distance: sqrt(dx² + dy²)
    return Math.sqrt(latMeters * latMeters + lonMeters * lonMeters);
  };

  // Normalizes coordinates to fit SVG viewport (0-400 width, 0-300 height).
  const normalizeCoordinates = (pois, buildingId, floorId) => {
    const poisOnFloor = pois.filter(
      (poi) =>
        String(poi.building_id) === String(buildingId) &&
        String(poi.floor_id) === String(floorId)
    );
    if (poisOnFloor.length === 0) return { pois: [], minLat: 0, maxLat: 0, minLon: 0, maxLon: 0 };

    const lats = poisOnFloor.map((poi) => poi.location.latitude);
    const lons = poisOnFloor.map((poi) => poi.location.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    const latRange = maxLat - minLat || 0.001;
    const lonRange = maxLon - minLon || 0.001;

    const normalized = poisOnFloor.map((poi) => ({
      ...poi,
      x: ((poi.location.longitude - minLon) / lonRange) * 380 + 10,
      y: ((maxLat - poi.location.latitude) / latRange) * 280 + 10
    }));

    return { pois: normalized, minLat, maxLat, minLon, maxLon };
  };

  // Draws floor map with POIs and optionally route line.
  const drawFloorMap = (poiData, buildingId, floorId, startId, endId, showRoute = false) => {
    floorMapEl.innerHTML = "";
    const { pois, minLat, maxLat, minLon, maxLon } = normalizeCoordinates(
      poiData,
      buildingId,
      floorId
    );

    if (pois.length === 0) {
      floorMapEl.innerHTML = `<text x="200" y="150" text-anchor="middle" fill="#98a0b3" font-size="14">No POIs on this floor</text>`;
      return;
    }

    // Draw route line only if showRoute is true and both start and end are on this floor
    if (showRoute) {
      const startPoi = pois.find((p) => String(p.id) === String(startId));
      const endPoi = pois.find((p) => String(p.id) === String(endId));
      if (startPoi && endPoi) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", startPoi.x);
        line.setAttribute("y1", startPoi.y);
        line.setAttribute("x2", endPoi.x);
        line.setAttribute("y2", endPoi.y);
        line.setAttribute("stroke", "#6d28d9");
        line.setAttribute("stroke-width", "3");
        line.setAttribute("stroke-dasharray", "5,5");
        line.setAttribute("opacity", "0.6");
        floorMapEl.appendChild(line);
      }
    }

    // Draw POI markers
    pois.forEach((poi) => {
      const isStart = String(poi.id) === String(startId);
      const isEnd = String(poi.id) === String(endId);
      const isRoute = isStart || isEnd;

      // Wrap POI in a group for click handling
      const poiGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      poiGroup.setAttribute("cursor", "pointer");
      poiGroup.setAttribute("class", "poi-marker-group");
      poiGroup.setAttribute("data-poi-id", poi.id);
      poiGroup.addEventListener("click", () => {
        if (onPoiClick) onPoiClick(poi.id);
      });
      
      // Hover handlers for tooltip
      poiGroup.addEventListener("mouseenter", (e) => {
        if (!poiTooltipEl || !floorMapEl) return;
        
        cancelTooltipHide(); // Cancel any pending hide
        
        // Convert SVG coordinates to screen coordinates
        const svgPoint = floorMapEl.createSVGPoint();
        svgPoint.x = poi.x;
        svgPoint.y = poi.y;
        const ctm = floorMapEl.getScreenCTM();
        if (!ctm) return;
        
        const screenPoint = svgPoint.matrixTransform(ctm);
        showPoiTooltip(poi, screenPoint.x, screenPoint.y);
      });
      poiGroup.addEventListener("mouseleave", () => {
        hidePoiTooltip(100); // Small delay to allow moving to tooltip
      });

      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", poi.x);
      circle.setAttribute("cy", poi.y);
      circle.setAttribute("r", isRoute ? "8" : "5");
      circle.setAttribute("fill", isStart ? "#10b981" : isEnd ? "#ef4444" : "#6b7280");
      circle.setAttribute("stroke", "#fff");
      circle.setAttribute("stroke-width", "2");
      poiGroup.appendChild(circle);

      // display_name label below each point
      const nameLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
      nameLabel.setAttribute("x", poi.x);
      nameLabel.setAttribute("y", poi.y + (isRoute ? 22 : 18));
      nameLabel.setAttribute("text-anchor", "middle");
      nameLabel.setAttribute("font-size", "4");
      nameLabel.setAttribute("fill", "#1d1f25");
      nameLabel.textContent = poi.display_name || "";
      poiGroup.appendChild(nameLabel);

      floorMapEl.appendChild(poiGroup);
    });
  };

  // Updates route preview with selected POIs. showRoute controls whether to draw route line and show distance/summary.
  const updateRoutePreview = (selection, poiData, showRoute = false) => {
    const startId = selection?.startId ? String(selection.startId) : "";
    const endId = selection?.endId ? String(selection.endId) : "";

    // Find POIs if they exist
    const startPoi = startId ? poiData.find((p) => String(p.id) === String(startId)) : null;
    const endPoi = endId ? poiData.find((p) => String(p.id) === String(endId)) : null;

    // Determine which building/floor to show on the map (priority: destination > start)
    let mapBuildingId = "";
    let mapFloorId = "";
    if (endPoi) {
      mapBuildingId = String(endPoi.building_id);
      mapFloorId = String(endPoi.floor_id);
    } else if (startPoi) {
      mapBuildingId = String(startPoi.building_id);
      mapFloorId = String(startPoi.floor_id);
    }

    // Always draw map if we have a selected POI; route line appears only when showRoute and both points are on the shown floor.
    if (mapBuildingId && mapFloorId) {
      drawFloorMap(poiData, mapBuildingId, mapFloorId, startId || null, endId || null, showRoute);
    } else if (floorMapEl) {
      floorMapEl.innerHTML = `<text x="200" y="150" text-anchor="middle" fill="#98a0b3" font-size="14">Select a start or destination</text>`;
    }

    // Update route info (show partial selection even before both are chosen)
    if (startPoi) {
      startNameEl.textContent = startPoi.display_name;
      startDetailsEl.textContent = `Building ${startPoi.building_id}, Floor ${startPoi.floor_id}`;
    } else {
      startNameEl.textContent = "-";
      startDetailsEl.textContent = "-";
    }

    if (endPoi) {
      endNameEl.textContent = endPoi.display_name;
      endDetailsEl.textContent = `Building ${endPoi.building_id}, Floor ${endPoi.floor_id}`;
    } else {
      endNameEl.textContent = "-";
      endDetailsEl.textContent = "-";
    }

    // Distance and route summary are only shown after preview button is clicked and both points exist.
    if (!showRoute || !startPoi || !endPoi) {
      distanceValueEl.textContent = "-";
      routeSummaryEl.textContent = "";
      routeSummaryEl.classList.remove("route-summary--success", "route-summary--unavailable");
      return;
    }

    const sameBuilding = startPoi.building_id === endPoi.building_id;
    const sameFloor = startPoi.floor_id === endPoi.floor_id;

    // For same-building different-floor routing, require an ACCESS connector to consider the route available.
    if (sameBuilding && !sameFloor) {
      const canShowRoute = hasAccessConnectorBetweenFloors(
        poiData,
        startPoi.building_id,
        startPoi.floor_id,
        endPoi.floor_id
      );
      if (!canShowRoute) {
        distanceValueEl.textContent = "-";
        routeSummaryEl.textContent = "Route is not available between these floors.";
        routeSummaryEl.classList.remove("route-summary--success");
        routeSummaryEl.classList.add("route-summary--unavailable");
        return;
      }
    }

    // Calculate distance
    const horizontalDist = calculateDistance(
      startPoi.location.latitude,
      startPoi.location.longitude,
      endPoi.location.latitude,
      endPoi.location.longitude
    );
    const floorDiff = Math.abs(startPoi.floor_id - endPoi.floor_id);
    const verticalDist = floorDiff * 3.5; // Assume 3.5m per floor
    const totalDist = Math.sqrt(horizontalDist * horizontalDist + verticalDist * verticalDist);

    distanceValueEl.textContent = `${Math.round(totalDist)}m`;

    // Route summary
    let summary = "";
    if (sameBuilding && sameFloor) {
      summary = "Route is found. Move to the destination.";
    } else if (sameBuilding && !sameFloor) {
      const direction = startPoi.floor_id < endPoi.floor_id ? "up" : "down";
      summary = `Same building. Go ${direction} to Floor ${endPoi.floor_id} (${floorDiff} floor${floorDiff > 1 ? "s" : ""}) via elevator or stairs.`;
    } else {
      summary = `Different buildings. Walk to Building ${endPoi.building_id}, then go to Floor ${endPoi.floor_id}.`;
    }

    routeSummaryEl.textContent = summary;
    routeSummaryEl.classList.toggle("route-summary--success", sameBuilding && sameFloor);
    routeSummaryEl.classList.remove("route-summary--unavailable");

    // Redraw map for the determined building and floor (showRoute toggles line drawing when possible)
    if (mapBuildingId && mapFloorId) {
      drawFloorMap(poiData, mapBuildingId, mapFloorId, startId, endId, showRoute);
    }
  };

  return { updateRoutePreview };
}
