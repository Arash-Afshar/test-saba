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

  // Normalizes ALL POIs into the same SVG coordinate space for an overview map.
  const normalizeCoordinatesOverview = (pois) => {
    const list = (pois || []).filter((p) => p?.location && typeof p.location.latitude === "number" && typeof p.location.longitude === "number");
    if (list.length === 0) return { pois: [], minLat: 0, maxLat: 0, minLon: 0, maxLon: 0 };

    const lats = list.map((poi) => poi.location.latitude);
    const lons = list.map((poi) => poi.location.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    const latRange = maxLat - minLat || 0.001;
    const lonRange = maxLon - minLon || 0.001;

    const normalized = list.map((poi) => ({
      ...poi,
      x: ((poi.location.longitude - minLon) / lonRange) * 380 + 10,
      y: ((maxLat - poi.location.latitude) / latRange) * 280 + 10
    }));

    return { pois: normalized, minLat, maxLat, minLon, maxLon };
  };

  const getBuildingBoxes = (normalizedPois, padding = 14) => {
    const byBuilding = new Map();
    (normalizedPois || []).forEach((p) => {
      const buildingId = String(p?.building_id ?? "");
      if (!buildingId) return;
      if (!byBuilding.has(buildingId)) byBuilding.set(buildingId, []);
      byBuilding.get(buildingId).push(p);
    });

    const boxes = new Map();
    byBuilding.forEach((items, buildingId) => {
      const xs = items.map((p) => p.x);
      const ys = items.map((p) => p.y);
      const minX = Math.min(...xs) - padding;
      const maxX = Math.max(...xs) + padding;
      const minY = Math.min(...ys) - padding;
      const maxY = Math.max(...ys) + padding;
      boxes.set(buildingId, { buildingId, minX, maxX, minY, maxY });
    });

    return boxes;
  };

  const createSvgEl = (tag) => document.createElementNS("http://www.w3.org/2000/svg", tag);

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const getBoundsFromBoxes = (boxes) => {
    const list = [...(boxes?.values?.() ?? [])];
    if (list.length === 0) return null;
    return {
      minX: Math.min(...list.map((b) => b.minX)),
      maxX: Math.max(...list.map((b) => b.maxX)),
      minY: Math.min(...list.map((b) => b.minY)),
      maxY: Math.max(...list.map((b) => b.maxY))
    };
  };

  const getSegmentRectIntersections = (start, end, rect) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const eps = 1e-6;

    const points = [];
    const addPoint = (x, y, t) => {
      if (t < -eps || t > 1 + eps) return;
      if (x < rect.minX - eps || x > rect.maxX + eps) return;
      if (y < rect.minY - eps || y > rect.maxY + eps) return;
      points.push({ x, y, t });
    };

    // Vertical edges: x = minX/maxX
    if (Math.abs(dx) > eps) {
      const t1 = (rect.minX - start.x) / dx;
      addPoint(rect.minX, start.y + t1 * dy, t1);
      const t2 = (rect.maxX - start.x) / dx;
      addPoint(rect.maxX, start.y + t2 * dy, t2);
    }

    // Horizontal edges: y = minY/maxY
    if (Math.abs(dy) > eps) {
      const t3 = (rect.minY - start.y) / dy;
      addPoint(start.x + t3 * dx, rect.minY, t3);
      const t4 = (rect.maxY - start.y) / dy;
      addPoint(start.x + t4 * dx, rect.maxY, t4);
    }

    // Deduplicate near-equal points
    const unique = [];
    points.forEach((p) => {
      const exists = unique.some((u) => Math.abs(u.x - p.x) < 0.01 && Math.abs(u.y - p.y) < 0.01);
      if (!exists) unique.push(p);
    });

    return unique.filter((p) => p.t >= -eps && p.t <= 1 + eps);
  };

  const getExitPointFromRect = (start, end, rect) => {
    const intersections = getSegmentRectIntersections(start, end, rect)
      .filter((p) => p.t > 1e-6 && p.t < 1 - 1e-6)
      .sort((a, b) => a.t - b.t);
    return intersections.length > 0 ? intersections[0] : null;
  };

  const drawOverviewMap = (poiData, startId, endId, showRoute = false) => {
    if (!floorMapEl) return { boxes: new Map(), normalizedPois: [] };
    floorMapEl.innerHTML = "";

    const { pois: normalizedPois } = normalizeCoordinatesOverview(poiData);
    if (normalizedPois.length === 0) {
      floorMapEl.innerHTML = `<text x="200" y="150" text-anchor="middle" fill="#98a0b3" font-size="14">No POIs available</text>`;
      return { boxes: new Map(), normalizedPois: [] };
    }

    const boxes = getBuildingBoxes(normalizedPois, 16);

    // Draw building boxes first (behind POIs)
    boxes.forEach((b) => {
      const rect = createSvgEl("rect");
      rect.setAttribute("x", String(b.minX));
      rect.setAttribute("y", String(b.minY));
      rect.setAttribute("width", String(b.maxX - b.minX));
      rect.setAttribute("height", String(b.maxY - b.minY));
      rect.setAttribute("class", "building-box");
      rect.setAttribute("data-building-id", b.buildingId);
      floorMapEl.appendChild(rect);

      const label = createSvgEl("text");
      label.setAttribute("x", String(b.minX + 6));
      label.setAttribute("y", String(b.minY + 12));
      label.setAttribute("class", "building-label");
      label.textContent = `B${b.buildingId}`;
      floorMapEl.appendChild(label);
    });

    // Draw route polyline (overview) if requested
    if (showRoute && startId && endId) {
      const startPoi = normalizedPois.find((p) => String(p.id) === String(startId));
      const endPoi = normalizedPois.find((p) => String(p.id) === String(endId));

      if (startPoi && endPoi) {
        const startPoint = { x: startPoi.x, y: startPoi.y };
        const endPoint = { x: endPoi.x, y: endPoi.y };

        const startBox = boxes.get(String(startPoi.building_id));
        const endBox = boxes.get(String(endPoi.building_id));

        let points = [startPoint, endPoint];

        if (startBox && endBox && String(startBox.buildingId) !== String(endBox.buildingId)) {
          const exitFromStart = getExitPointFromRect(startPoint, endPoint, startBox);
          const entryToEnd = getExitPointFromRect(endPoint, startPoint, endBox); // reverse segment

          if (exitFromStart && entryToEnd) {
            points = [startPoint, { x: exitFromStart.x, y: exitFromStart.y }, { x: entryToEnd.x, y: entryToEnd.y }, endPoint];
          }
        }

        const poly = createSvgEl("polyline");
        poly.setAttribute(
          "points",
          points.map((p) => `${p.x},${p.y}`).join(" ")
        );
        poly.setAttribute("class", "overview-route");
        floorMapEl.appendChild(poly);
      }
    }

    // Draw POI markers
    normalizedPois.forEach((poi) => {
      const isStart = String(poi.id) === String(startId);
      const isEnd = String(poi.id) === String(endId);
      const isRoute = isStart || isEnd;

      const poiGroup = createSvgEl("g");
      poiGroup.setAttribute("cursor", "pointer");
      poiGroup.setAttribute("class", "poi-marker-group");
      poiGroup.setAttribute("data-poi-id", poi.id);
      poiGroup.addEventListener("click", () => {
        if (onPoiClick) onPoiClick(poi.id);
      });

      poiGroup.addEventListener("mouseenter", () => {
        if (!poiTooltipEl || !floorMapEl) return;
        cancelTooltipHide();

        const svgPoint = floorMapEl.createSVGPoint();
        svgPoint.x = poi.x;
        svgPoint.y = poi.y;
        const ctm = floorMapEl.getScreenCTM();
        if (!ctm) return;
        const screenPoint = svgPoint.matrixTransform(ctm);
        showPoiTooltip(poi, screenPoint.x, screenPoint.y);
      });
      poiGroup.addEventListener("mouseleave", () => {
        hidePoiTooltip(100);
      });

      const circle = createSvgEl("circle");
      circle.setAttribute("cx", String(poi.x));
      circle.setAttribute("cy", String(poi.y));
      circle.setAttribute("r", isRoute ? "8" : "5");
      circle.setAttribute("fill", isStart ? "#10b981" : isEnd ? "#ef4444" : "#6b7280");
      circle.setAttribute("stroke", "#fff");
      circle.setAttribute("stroke-width", "2");
      poiGroup.appendChild(circle);

      const nameLabel = createSvgEl("text");
      nameLabel.setAttribute("x", String(poi.x));
      nameLabel.setAttribute("y", String(poi.y + (isRoute ? 22 : 18)));
      nameLabel.setAttribute("text-anchor", "middle");
      nameLabel.setAttribute("font-size", "4");
      nameLabel.setAttribute("fill", "#1d1f25");
      nameLabel.textContent = poi.display_name || "";
      poiGroup.appendChild(nameLabel);

      floorMapEl.appendChild(poiGroup);
    });

    return { boxes, normalizedPois };
  };

  const setViewBoxToFit = (bounds, padding = 18) => {
    if (!floorMapEl || !bounds) return;
    const eps = 0.01;

    let minX = bounds.minX - padding;
    let maxX = bounds.maxX + padding;
    let minY = bounds.minY - padding;
    let maxY = bounds.maxY + padding;

    let w = Math.max(eps, maxX - minX);
    let h = Math.max(eps, maxY - minY);

    // Keep 4:3 aspect ratio (matches default 400x300)
    const targetRatio = 400 / 300;
    const currentRatio = w / h;
    if (currentRatio > targetRatio) {
      const newH = w / targetRatio;
      const diff = newH - h;
      minY -= diff / 2;
      maxY += diff / 2;
      h = newH;
    } else if (currentRatio < targetRatio) {
      const newW = h * targetRatio;
      const diff = newW - w;
      minX -= diff / 2;
      maxX += diff / 2;
      w = newW;
    }

    // Avoid excessive zoom-in (keep a minimum viewBox size)
    const minWidth = 220;
    if (w < minWidth) {
      const scale = minWidth / w;
      const newW = w * scale;
      const newH = h * scale;
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      minX = cx - newW / 2;
      maxX = cx + newW / 2;
      minY = cy - newH / 2;
      maxY = cy + newH / 2;
      w = newW;
      h = newH;
    }

    // Clamp to a reasonable max to prevent tiny content
    const maxWidth = 800;
    w = clamp(w, eps, maxWidth);
    h = w / (400 / 300);

    floorMapEl.setAttribute("viewBox", `${minX} ${minY} ${w} ${h}`);
  };

  const resetViewBox = () => {
    if (!floorMapEl) return;
    floorMapEl.setAttribute("viewBox", "0 0 400 300");
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

    const hasStart = Boolean(startPoi);
    const hasEnd = Boolean(endPoi);

    const sameBuilding = hasStart && hasEnd && startPoi.building_id === endPoi.building_id;
    const sameFloor = hasStart && hasEnd && startPoi.floor_id === endPoi.floor_id;
    const canUseFloorView = sameBuilding && sameFloor;

    // Decide which map mode to render.
    // - No selection: overview (show all POIs)
    // - One selected: overview, fit to that building
    // - Two selected:
    //    - same building+floor => floor view
    //    - otherwise => overview (so both are visible)
    if (canUseFloorView) {
      const mapBuildingId = String(startPoi.building_id);
      const mapFloorId = String(startPoi.floor_id);
      resetViewBox();
      drawFloorMap(poiData, mapBuildingId, mapFloorId, startId || null, endId || null, showRoute);
    } else {
      const { boxes } = drawOverviewMap(poiData, startId, endId, showRoute);

      // Auto-fit viewBox depending on selection state.
      const startBuildingId = startPoi ? String(startPoi.building_id) : "";
      const endBuildingId = endPoi ? String(endPoi.building_id) : "";

      let fitBounds = null;
      if (hasStart && hasEnd && startBuildingId && endBuildingId) {
        const startBox = boxes.get(startBuildingId);
        const endBox = boxes.get(endBuildingId);
        if (startBox && endBox) {
          fitBounds = {
            minX: Math.min(startBox.minX, endBox.minX),
            maxX: Math.max(startBox.maxX, endBox.maxX),
            minY: Math.min(startBox.minY, endBox.minY),
            maxY: Math.max(startBox.maxY, endBox.maxY)
          };
        }
      } else if (hasStart && startBuildingId) {
        fitBounds = boxes.get(startBuildingId) ?? null;
      } else if (hasEnd && endBuildingId) {
        fitBounds = boxes.get(endBuildingId) ?? null;
      } else {
        fitBounds = getBoundsFromBoxes(boxes);
      }

      if (fitBounds) setViewBoxToFit(fitBounds, 18);
      else resetViewBox();
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
