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
  const routeStepsEl = host.querySelector("#routeSteps");
  const floorMapEl = host.querySelector("#floorMap");
  const poiTooltipEl = host.querySelector("#poiTooltip");

  const errorModalEl = host.querySelector("#routeErrorModal");
  const errorModalMessageEl = host.querySelector("#routeErrorMessage");
  const errorModalCloseEl = host.querySelector("#routeErrorClose");

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

  const getPoiTypeName = (poi) => String(poi?.poi_type?.name ?? "");

  const isElevator = (poi) => getPoiTypeName(poi).toUpperCase() === "ELEVATOR";
  const isStairs = (poi) => getPoiTypeName(poi).toUpperCase() === "STAIRS";
  const isConnector = (poi) => getPoiTypeName(poi).toUpperCase() === "CONNECTOR";

  // ---------- Accessible error modal ----------
  let lastActiveBeforeModal = null;
  const isModalOpen = () => Boolean(errorModalEl && !errorModalEl.hasAttribute("hidden"));

  const closeErrorModal = () => {
    if (!errorModalEl) return;
    errorModalEl.setAttribute("hidden", "");
    if (lastActiveBeforeModal && typeof lastActiveBeforeModal.focus === "function") {
      lastActiveBeforeModal.focus();
    }
    lastActiveBeforeModal = null;
  };

  const openErrorModal = (message) => {
    if (!errorModalEl || !errorModalMessageEl) return;
    lastActiveBeforeModal = document.activeElement;
    errorModalMessageEl.textContent = String(message || "");
    errorModalEl.removeAttribute("hidden");
    errorModalCloseEl?.focus?.();
  };

  if (errorModalCloseEl) errorModalCloseEl.addEventListener("click", closeErrorModal);
  if (errorModalEl) {
    errorModalEl.addEventListener("click", (e) => {
      const target = e.target;
      if (target && target.getAttribute && target.getAttribute("data-close") === "true") closeErrorModal();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (!isModalOpen()) return;
    if (e.key === "Escape") closeErrorModal();
  });

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

  // Draws floor map with POIs and an optional segment (map-per-step).
  const drawFloorMap = ({
    poiData,
    buildingId,
    floorId,
    startId,
    endId,
    segmentFromId = null,
    segmentToId = null,
    highlightIds = []
  }) => {
    floorMapEl.innerHTML = "";
    const { pois } = normalizeCoordinates(poiData, buildingId, floorId);

    if (pois.length === 0) {
      floorMapEl.innerHTML = `<text x="200" y="150" text-anchor="middle" fill="#98a0b3" font-size="14">No POIs on this floor</text>`;
      return;
    }

    // Floor label
    const floorLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    floorLabel.setAttribute("x", "12");
    floorLabel.setAttribute("y", "18");
    floorLabel.setAttribute("text-anchor", "start");
    floorLabel.setAttribute("font-size", "10");
    floorLabel.setAttribute("fill", "#6b7280");
    floorLabel.textContent = `Building ${buildingId}, Floor ${floorId}`;
    floorMapEl.appendChild(floorLabel);

    // Step segment line (only if both endpoints are on this floor and different).
    if (segmentFromId && segmentToId && String(segmentFromId) !== String(segmentToId)) {
      const fromPoi = pois.find((p) => String(p.id) === String(segmentFromId));
      const toPoi = pois.find((p) => String(p.id) === String(segmentToId));
      if (fromPoi && toPoi) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", fromPoi.x);
        line.setAttribute("y1", fromPoi.y);
        line.setAttribute("x2", toPoi.x);
        line.setAttribute("y2", toPoi.y);
        line.setAttribute("stroke", "#6d28d9");
        line.setAttribute("stroke-width", "4");
        line.setAttribute("stroke-linecap", "round");
        line.setAttribute("opacity", "0.8");
        floorMapEl.appendChild(line);
      }
    }

    // Draw POI markers
    pois.forEach((poi) => {
      const isStart = String(poi.id) === String(startId);
      const isEnd = String(poi.id) === String(endId);
      const isHighlighted = highlightIds.some((id) => String(id) === String(poi.id));
      const isRoute = isStart || isEnd || isHighlighted;

      // Wrap POI in a group for click handling
      const poiGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      poiGroup.setAttribute("cursor", "pointer");
      poiGroup.setAttribute("class", "poi-marker-group");
      poiGroup.setAttribute("data-poi-id", poi.id);
      poiGroup.setAttribute("tabindex", "0");
      poiGroup.setAttribute("role", "button");
      poiGroup.setAttribute(
        "aria-label",
        `${poi.display_name || "Location"}, Building ${poi.building_id}, Floor ${poi.floor_id}, ${getPoiTypeName(poi) || "category"}`
      );
      poiGroup.addEventListener("click", () => {
        if (onPoiClick) onPoiClick(poi.id);
      });
      poiGroup.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (onPoiClick) onPoiClick(poi.id);
        }
      });
      
      // Hover + focus handlers for tooltip (not hover-only).
      const showTooltipForPoi = () => {
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
      };

      poiGroup.addEventListener("mouseenter", showTooltipForPoi);
      poiGroup.addEventListener("focus", showTooltipForPoi);
      poiGroup.addEventListener("mouseleave", () => hidePoiTooltip(100));
      poiGroup.addEventListener("blur", () => hidePoiTooltip(0));

      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", poi.x);
      circle.setAttribute("cy", poi.y);
      circle.setAttribute("r", isStart || isEnd ? "8" : isHighlighted ? "7" : "5");
      circle.setAttribute("fill", isStart ? "#10b981" : isEnd ? "#ef4444" : "#6b7280");
      circle.setAttribute("stroke", isHighlighted ? "#6d28d9" : "#fff");
      circle.setAttribute("stroke-width", isHighlighted ? "3" : "2");
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

  // ---------- Route planning (elevator-first) ----------
  const getPoiById = (poiData, poiId) =>
    poiData.find((p) => String(p.id) === String(poiId)) || null;

  const getPoisByBuildingFloor = (poiData, buildingId, floorId) =>
    poiData.filter(
      (p) => String(p.building_id) === String(buildingId) && String(p.floor_id) === String(floorId)
    );

  const getVerticalConnectors = (poiData, buildingId, floorId, kind) => {
    const target = String(kind || "").toUpperCase();
    return getPoisByBuildingFloor(poiData, buildingId, floorId).filter(
      (p) => getPoiTypeName(p).toUpperCase() === target
    );
  };

  const getConnectorsByName = (poiData, buildingId, connectorName) =>
    poiData.filter(
      (p) =>
        String(p.building_id) === String(buildingId) &&
        isConnector(p) &&
        String(p.display_name || "").trim() === String(connectorName || "").trim()
    );

  const floorDistanceMeters = (floorA, floorB) => Math.abs(Number(floorA) - Number(floorB)) * 3.5;

  const distanceBetweenPois = (a, b) =>
    calculateDistance(a.location.latitude, a.location.longitude, b.location.latitude, b.location.longitude);

  const findBestVerticalConnectorPair = ({ poiData, buildingId, fromFloorId, toFloorId, fromPoi, toPoi }) => {
    const tryKinds = ["ELEVATOR", "STAIRS"]; // elevator-first

    for (const kind of tryKinds) {
      const fromCandidates = getVerticalConnectors(poiData, buildingId, fromFloorId, kind);
      const toCandidates = getVerticalConnectors(poiData, buildingId, toFloorId, kind);
      if (fromCandidates.length === 0 || toCandidates.length === 0) continue;

      let best = null;
      let bestCost = Number.POSITIVE_INFINITY;
      for (const a of fromCandidates) {
        for (const b of toCandidates) {
          const cost = distanceBetweenPois(fromPoi, a) + distanceBetweenPois(b, toPoi);
          if (cost < bestCost) {
            bestCost = cost;
            best = { kind, fromConnector: a, toConnector: b };
          }
        }
      }
      if (best) return best;
    }

    return null;
  };

  const buildBuildingGraph = (poiData) => {
    // adjacency: buildingId -> Map(neighborBuildingId -> connectorName)
    /** @type {Map<string, Map<string, string>>} */
    const adjacency = new Map();

    const connectors = poiData.filter((p) => isConnector(p) && String(p.display_name || "").trim() !== "");
    /** @type {Map<string, any[]>} */
    const byName = new Map();
    connectors.forEach((p) => {
      const name = String(p.display_name).trim();
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name).push(p);
    });

    const addEdge = (a, b, name) => {
      if (!adjacency.has(a)) adjacency.set(a, new Map());
      if (!adjacency.has(b)) adjacency.set(b, new Map());
      // Keep first connector if multiple exist.
      if (!adjacency.get(a).has(b)) adjacency.get(a).set(b, name);
      if (!adjacency.get(b).has(a)) adjacency.get(b).set(a, name);
    };

    byName.forEach((pois, name) => {
      const buildings = [...new Set(pois.map((p) => String(p.building_id)))];
      if (buildings.length < 2) return;
      for (let i = 0; i < buildings.length; i++) {
        for (let j = i + 1; j < buildings.length; j++) addEdge(buildings[i], buildings[j], name);
      }
    });

    return adjacency;
  };

  const findBuildingPath = (adjacency, startBuildingId, endBuildingId) => {
    const start = String(startBuildingId);
    const goal = String(endBuildingId);
    if (!start || !goal) return null;
    if (start === goal) return [];

    /** @type {Map<string, {from: string, connectorName: string}>} */
    const prev = new Map();
    /** @type {string[]} */
    const queue = [start];
    prev.set(start, null);

    while (queue.length > 0) {
      const cur = queue.shift();
      if (cur === goal) break;
      const neighbors = adjacency.get(cur);
      if (!neighbors) continue;
      for (const [n, connectorName] of neighbors.entries()) {
        if (prev.has(n)) continue;
        prev.set(n, { from: cur, connectorName });
        queue.push(n);
      }
    }

    if (!prev.has(goal)) return null;

    /** @type {{fromBuildingId: string, toBuildingId: string, connectorName: string}[]} */
    const edges = [];
    let cur = goal;
    while (cur !== start) {
      const info = prev.get(cur);
      edges.push({ fromBuildingId: info.from, toBuildingId: cur, connectorName: info.connectorName });
      cur = info.from;
    }
    edges.reverse();
    return edges;
  };

  const routeWithinBuilding = ({ poiData, fromPoi, toPoi }) => {
    if (String(fromPoi.building_id) !== String(toPoi.building_id)) {
      return { ok: false, reason: "Locations are in different buildings." };
    }

    const buildingId = String(fromPoi.building_id);
    const fromFloorId = String(fromPoi.floor_id);
    const toFloorId = String(toPoi.floor_id);

    /** @type {any[]} */
    const steps = [];
    let distanceMeters = 0;
    let requiresStairs = false;

    if (fromFloorId === toFloorId) {
      steps.push({
        kind: "go",
        text: `Go to ${toPoi.display_name}.`,
        mapView: {
          buildingId,
          floorId: fromFloorId,
          fromPoiId: String(fromPoi.id),
          toPoiId: String(toPoi.id),
          highlightIds: [String(fromPoi.id), String(toPoi.id)]
        }
      });
      distanceMeters += distanceBetweenPois(fromPoi, toPoi);
      return { ok: true, steps, distanceMeters, requiresStairs };
    }

    // Different floors: find a vertical path (elevator-first, stairs only when required).
    const allFloors = [
      ...new Set(
        poiData
          .filter((p) => String(p.building_id) === String(buildingId))
          .map((p) => String(p.floor_id))
      )
    ].sort((a, b) => Number(a) - Number(b));

    const hasElevatorOnFloor = (floorId) =>
      getVerticalConnectors(poiData, buildingId, floorId, "ELEVATOR").length > 0;
    const hasStairsOnFloor = (floorId) =>
      getVerticalConnectors(poiData, buildingId, floorId, "STAIRS").length > 0;

    /** @type {Map<string, {toFloorId: string, kind: "ELEVATOR"|"STAIRS"}[]>} */
    const floorAdjacency = new Map(allFloors.map((f) => [f, []]));

    const addFloorEdge = (from, to, kind) => {
      if (!floorAdjacency.has(from)) floorAdjacency.set(from, []);
      floorAdjacency.get(from).push({ toFloorId: String(to), kind });
    };

    // Create vertical edges between floors that both have an elevator or both have stairs.
    for (let i = 0; i < allFloors.length; i++) {
      for (let j = i + 1; j < allFloors.length; j++) {
        const a = allFloors[i];
        const b = allFloors[j];
        if (hasElevatorOnFloor(a) && hasElevatorOnFloor(b)) {
          addFloorEdge(a, b, "ELEVATOR");
          addFloorEdge(b, a, "ELEVATOR");
        }
        if (hasStairsOnFloor(a) && hasStairsOnFloor(b)) {
          addFloorEdge(a, b, "STAIRS");
          addFloorEdge(b, a, "STAIRS");
        }
      }
    }

    const edgeWeight = (kind) => (kind === "ELEVATOR" ? 1 : 100) + 0.1; // stairs are heavily penalized

    /** @type {Map<string, number>} */
    const dist = new Map(allFloors.map((f) => [f, Number.POSITIVE_INFINITY]));
    /** @type {Map<string, {fromFloorId: string, kind: "ELEVATOR"|"STAIRS"} | null>} */
    const prev = new Map();
    /** @type {Set<string>} */
    const unvisited = new Set(allFloors);

    dist.set(fromFloorId, 0);
    prev.set(fromFloorId, null);

    while (unvisited.size > 0) {
      // Pick the unvisited node with the smallest distance (graph is tiny).
      let current = null;
      let bestDist = Number.POSITIVE_INFINITY;
      for (const f of unvisited) {
        const d = dist.get(f);
        if (d < bestDist) {
          bestDist = d;
          current = f;
        }
      }

      if (current === null || bestDist === Number.POSITIVE_INFINITY) break;
      unvisited.delete(current);
      if (current === toFloorId) break;

      const edges = floorAdjacency.get(current) || [];
      for (const edge of edges) {
        if (!unvisited.has(edge.toFloorId)) continue;
        const alt = dist.get(current) + edgeWeight(edge.kind);
        if (alt < dist.get(edge.toFloorId)) {
          dist.set(edge.toFloorId, alt);
          prev.set(edge.toFloorId, { fromFloorId: current, kind: edge.kind });
        }
      }
    }

    if (!prev.has(toFloorId)) {
      const elevatorFloors = allFloors.filter((f) => hasElevatorOnFloor(f));
      const stairsFloors = allFloors.filter((f) => hasStairsOnFloor(f));

      const parts = [];
      parts.push(
        `Can’t create an indoor route between Floor ${fromFloorId} and Floor ${toFloorId} in Building ${buildingId}.`
      );
      parts.push("No elevator or stairs path connects these floors.");
      if (elevatorFloors.length > 0) parts.push(`Elevator available on floors: ${elevatorFloors.join(", ")}.`);
      if (stairsFloors.length > 0) parts.push(`Stairs available on floors: ${stairsFloors.join(", ")}.`);
      return { ok: false, reason: parts.join(" ") };
    }

    // Reconstruct the floor path.
    /** @type {{fromFloorId: string, toFloorId: string, kind: "ELEVATOR"|"STAIRS"}[]} */
    const floorPath = [];
    let curFloor = toFloorId;
    while (curFloor !== fromFloorId) {
      const info = prev.get(curFloor);
      floorPath.push({ fromFloorId: info.fromFloorId, toFloorId: curFloor, kind: info.kind });
      curFloor = info.fromFloorId;
    }
    floorPath.reverse();

    const pickNearest = (candidates, referencePoi) => {
      let best = candidates[0];
      let bestD = Number.POSITIVE_INFINITY;
      for (const c of candidates) {
        const d = distanceBetweenPois(referencePoi, c);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      return best;
    };

    let currentPoi = fromPoi;
    for (const edge of floorPath) {
      const fromConnectors = getVerticalConnectors(poiData, buildingId, edge.fromFloorId, edge.kind);
      const toConnectors = getVerticalConnectors(poiData, buildingId, edge.toFloorId, edge.kind);
      if (fromConnectors.length === 0 || toConnectors.length === 0) {
        return {
          ok: false,
          reason: `Can’t create an indoor route: missing ${edge.kind.toLowerCase()} on Floor ${edge.fromFloorId} or Floor ${edge.toFloorId} in Building ${buildingId}.`
        };
      }

      const fromConnector = pickNearest(fromConnectors, currentPoi);
      const toConnector = pickNearest(toConnectors, toPoi);

      // Step: go to elevator/stairs on the current floor (only if not already there).
      if (String(currentPoi.id) !== String(fromConnector.id)) {
        steps.push({
          kind: "go",
          text: `Go to ${fromConnector.display_name}.`,
          mapView: {
            buildingId,
            floorId: edge.fromFloorId,
            fromPoiId: String(currentPoi.id),
            toPoiId: String(fromConnector.id),
            highlightIds: [String(currentPoi.id), String(fromConnector.id)]
          }
        });
        distanceMeters += distanceBetweenPois(currentPoi, fromConnector);
      }

      // Step: take elevator/stairs to the next floor.
      const verb = edge.kind === "ELEVATOR" ? "Take the elevator" : "Use the stairs";
      steps.push({
        kind: edge.kind === "ELEVATOR" ? "elevator" : "stairs",
        text: `${verb} to Floor ${edge.toFloorId}.`,
        mapView: {
          buildingId,
          floorId: edge.fromFloorId,
          fromPoiId: String(fromConnector.id),
          toPoiId: String(fromConnector.id),
          highlightIds: [String(fromConnector.id)]
        }
      });
      distanceMeters += floorDistanceMeters(edge.fromFloorId, edge.toFloorId);
      if (edge.kind === "STAIRS") requiresStairs = true;

      // Arrive on the next floor at a connector endpoint.
      currentPoi = toConnector;
    }

    // Final step: go to destination on the destination floor.
    if (String(currentPoi.id) !== String(toPoi.id)) {
      steps.push({
        kind: "go",
        text: `Go to ${toPoi.display_name}.`,
        mapView: {
          buildingId,
          floorId: toFloorId,
          fromPoiId: String(currentPoi.id),
          toPoiId: String(toPoi.id),
          highlightIds: [String(currentPoi.id), String(toPoi.id)]
        }
      });
      distanceMeters += distanceBetweenPois(currentPoi, toPoi);
    }

    return { ok: true, steps, distanceMeters, requiresStairs };
  };

  const buildRoutePlan = (poiData, startPoi, endPoi) => {
    const startBuildingId = String(startPoi.building_id);
    const endBuildingId = String(endPoi.building_id);

    if (startBuildingId === endBuildingId) {
      const within = routeWithinBuilding({ poiData, fromPoi: startPoi, toPoi: endPoi });
      return within.ok
        ? { ok: true, steps: within.steps, distanceMeters: within.distanceMeters, requiresStairs: within.requiresStairs }
        : { ok: false, reason: within.reason };
    }

    // Cross-building: require connector path.
    const graph = buildBuildingGraph(poiData);
    const path = findBuildingPath(graph, startBuildingId, endBuildingId);
    if (!path) {
      return {
        ok: false,
        reason: `Can’t create an indoor route between Building ${startBuildingId} and Building ${endBuildingId}: no connector links these buildings.`
      };
    }

    /** @type {any[]} */
    const steps = [];
    let distanceMeters = 0;
    let requiresStairs = false;

    let currentPoi = startPoi;
    for (const edge of path) {
      const fromBuildingId = edge.fromBuildingId;
      const toBuildingId = edge.toBuildingId;
      const connectorName = edge.connectorName;

      const fromCandidates = getConnectorsByName(poiData, fromBuildingId, connectorName);
      const toCandidates = getConnectorsByName(poiData, toBuildingId, connectorName);
      if (fromCandidates.length === 0 || toCandidates.length === 0) {
        return {
          ok: false,
          reason: `Can’t create an indoor route: connector '${connectorName}' is missing in one of the buildings.`
        };
      }

      // Pick the connector endpoint in the current building closest to our current position.
      let connectorFrom = fromCandidates[0];
      let best = Number.POSITIVE_INFINITY;
      for (const c of fromCandidates) {
        const d = distanceBetweenPois(currentPoi, c);
        if (d < best) {
          best = d;
          connectorFrom = c;
        }
      }

      // Pick a connector endpoint in the next building (prefer same floor as connectorFrom if available).
      const sameFloor = toCandidates.find((c) => String(c.floor_id) === String(connectorFrom.floor_id));
      const connectorTo = sameFloor || toCandidates[0];

      // Route inside the current building to reach the connector endpoint.
      const within = routeWithinBuilding({ poiData, fromPoi: currentPoi, toPoi: connectorFrom });
      if (!within.ok) return { ok: false, reason: within.reason };
      steps.push(...within.steps);
      distanceMeters += within.distanceMeters;
      if (within.requiresStairs) requiresStairs = true;

      // Connector step (building transition).
      steps.push({
        kind: "connector",
        text: `Take '${connectorName}' to Building ${toBuildingId}.`,
        mapView: {
          buildingId: String(connectorTo.building_id),
          floorId: String(connectorTo.floor_id),
          fromPoiId: String(connectorTo.id),
          toPoiId: String(connectorTo.id),
          highlightIds: [String(connectorTo.id)]
        }
      });
      distanceMeters += distanceBetweenPois(connectorFrom, connectorTo);

      currentPoi = connectorTo;
    }

    // Route inside the final building from last connector endpoint to destination.
    const finalWithin = routeWithinBuilding({ poiData, fromPoi: currentPoi, toPoi: endPoi });
    if (!finalWithin.ok) return { ok: false, reason: finalWithin.reason };
    steps.push(...finalWithin.steps);
    distanceMeters += finalWithin.distanceMeters;
    if (finalWithin.requiresStairs) requiresStairs = true;

    return { ok: true, steps, distanceMeters, requiresStairs };
  };

  // ---------- Step list + map-per-step state ----------
  let activeStepIndex = 0;
  /** @type {any|null} */
  let currentPlan = null;

  const renderSteps = () => {
    if (!routeStepsEl) return;
    routeStepsEl.innerHTML = "";
    const steps = currentPlan?.steps || [];
    steps.forEach((step, idx) => {
      const li = document.createElement("li");
      li.className = `route-step${idx === activeStepIndex ? " route-step--active" : ""}`;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "route-step__button";
      btn.textContent = `${idx + 1}. ${step.text}`;
      if (idx === activeStepIndex) btn.setAttribute("aria-current", "step");
      btn.addEventListener("click", () => {
        activeStepIndex = idx;
        renderSteps();
        const map = step.mapView;
        if (map) {
          drawFloorMap({
            poiData: currentPlan.poiData,
            buildingId: map.buildingId,
            floorId: map.floorId,
            startId: currentPlan.startId,
            endId: currentPlan.endId,
            segmentFromId: map.fromPoiId,
            segmentToId: map.toPoiId,
            highlightIds: map.highlightIds || []
          });
        }
      });

      li.appendChild(btn);
      routeStepsEl.appendChild(li);
    });
  };

  // Updates route preview with selected POIs. showRoute controls whether to draw route line.
  const updateRoutePreview = (selection, poiData, showRoute = false) => {
    const { startId, endId } = selection;
    
    // Find POIs if they exist
    const startPoi = startId ? poiData.find((p) => String(p.id) === String(startId)) : null;
    const endPoi = endId ? poiData.find((p) => String(p.id) === String(endId)) : null;
    
    // Determine which building/floor to show on the map
    // Priority: active step > destination > start
    let mapBuildingId = "";
    let mapFloorId = "";
    
    // Update route info (independent of showRoute).
    startNameEl.textContent = startPoi ? startPoi.display_name : "-";
    startDetailsEl.textContent = startPoi
      ? `Building ${startPoi.building_id}, Floor ${startPoi.floor_id}`
      : "-";
    endNameEl.textContent = endPoi ? endPoi.display_name : "-";
    endDetailsEl.textContent = endPoi ? `Building ${endPoi.building_id}, Floor ${endPoi.floor_id}` : "-";

    // Default map when not showing steps.
    if (endPoi) {
      mapBuildingId = String(endPoi.building_id);
      mapFloorId = String(endPoi.floor_id);
    } else if (startPoi) {
      mapBuildingId = String(startPoi.building_id);
      mapFloorId = String(startPoi.floor_id);
    }

    // Clear steps until preview is requested.
    if (!showRoute) {
      currentPlan = null;
      activeStepIndex = 0;
      if (routeStepsEl) routeStepsEl.innerHTML = "";
      distanceValueEl.textContent = "-";
      routeSummaryEl.textContent = startPoi || endPoi ? "Select “Preview route” to see steps." : "";
      routeSummaryEl.classList.remove("route-summary--success", "route-summary--unavailable");
      if (isModalOpen()) closeErrorModal();
      if (mapBuildingId && mapFloorId) {
        drawFloorMap({
          poiData,
          buildingId: mapBuildingId,
          floorId: mapFloorId,
          startId: startId || null,
          endId: endId || null
        });
      }
      return;
    }

    // Preview requested but missing selection.
    if (!startPoi || !endPoi) {
      distanceValueEl.textContent = "-";
      routeSummaryEl.textContent = "Select a start and destination to preview a route.";
      routeSummaryEl.classList.remove("route-summary--success", "route-summary--unavailable");
      currentPlan = null;
      activeStepIndex = 0;
      if (routeStepsEl) routeStepsEl.innerHTML = "";
      if (mapBuildingId && mapFloorId) {
        drawFloorMap({
          poiData,
          buildingId: mapBuildingId,
          floorId: mapFloorId,
          startId: startId || null,
          endId: endId || null
        });
      }
      return;
    }

    const plan = buildRoutePlan(poiData, startPoi, endPoi);
    if (!plan.ok) {
      currentPlan = null;
      activeStepIndex = 0;
      if (routeStepsEl) routeStepsEl.innerHTML = "";
      distanceValueEl.textContent = "-";
      routeSummaryEl.textContent = "Route unavailable.";
      routeSummaryEl.classList.remove("route-summary--success");
      routeSummaryEl.classList.add("route-summary--unavailable");
      openErrorModal(plan.reason);

      // Still show a helpful map.
      mapBuildingId = String(startPoi.building_id);
      mapFloorId = String(startPoi.floor_id);
      drawFloorMap({
        poiData,
        buildingId: mapBuildingId,
        floorId: mapFloorId,
        startId: startId || null,
        endId: endId || null
      });
      return;
    }

    if (isModalOpen()) closeErrorModal();

    // Success: show steps and allow map-per-step.
    currentPlan = {
      poiData,
      startId: String(startPoi.id),
      endId: String(endPoi.id),
      steps: plan.steps
    };
    activeStepIndex = 0;
    renderSteps();

    distanceValueEl.textContent = `${Math.round(plan.distanceMeters)}m`;
    if (plan.requiresStairs) {
      routeSummaryEl.textContent = "Route found. Stairs required. Select a step to view it on the map.";
    } else {
      routeSummaryEl.textContent = "Route found. Select a step to view it on the map.";
    }
    routeSummaryEl.classList.add("route-summary--success");
    routeSummaryEl.classList.remove("route-summary--unavailable");

    // Draw first step.
    const first = plan.steps[0]?.mapView;
    if (first) {
      drawFloorMap({
        poiData,
        buildingId: first.buildingId,
        floorId: first.floorId,
        startId: String(startPoi.id),
        endId: String(endPoi.id),
        segmentFromId: first.fromPoiId,
        segmentToId: first.toPoiId,
        highlightIds: first.highlightIds || []
      });
    } else if (mapBuildingId && mapFloorId) {
      drawFloorMap({
        poiData,
        buildingId: mapBuildingId,
        floorId: mapFloorId,
        startId: String(startPoi.id),
        endId: String(endPoi.id)
      });
    }
  };

  return { updateRoutePreview };
}
