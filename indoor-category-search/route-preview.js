export function initRoutePreview({ hostId }) {
  const host = document.querySelector(hostId);
  if (!host) return;

  // -------- Selector initializations --------
  const startNameEl = host.querySelector("#startName");
  const startDetailsEl = host.querySelector("#startDetails");
  const endNameEl = host.querySelector("#endName");
  const endDetailsEl = host.querySelector("#endDetails");
  const distanceValueEl = host.querySelector("#distanceValue");
  const routeStepsPanelEl = host.querySelector("#routeStepsPanel");
  const routeStepBoxEl = host.querySelector("#routeStepBox");
  const routeStepCurrentEl = host.querySelector("#routeStepCurrent");
  const routeStepPrevEl = host.querySelector("#routeStepPrev");
  const routeStepNextEl = host.querySelector("#routeStepNext");
  const floorMapEl = host.querySelector("#floorMap");
  const poiTooltipEl = host.querySelector("#poiTooltip");

  const errorModalEl = host.querySelector("#routeErrorModal");
  const errorModalMessageEl = host.querySelector("#routeErrorMessage");
  const errorModalCloseEl = host.querySelector("#routeErrorClose");
  const arrivedModalEl = host.querySelector("#arrivedModal");
  const arrivedCloseEl = host.querySelector("#arrivedClose");

  // -------- Shared helpers + state --------
  const getPoiTypeName = (poi) => String(poi?.poi_type?.name ?? "");
  const isConnector = (poi) => getPoiTypeName(poi).toUpperCase() === "CONNECTOR";
  let tooltipHideTimeout = null;

  // -------- Modal controls --------
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

  let lastActiveBeforeArrived = null;
  const closeArrivedModal = () => {
    if (!arrivedModalEl) return;
    arrivedModalEl.setAttribute("hidden", "");
    if (lastActiveBeforeArrived && typeof lastActiveBeforeArrived.focus === "function") {
      lastActiveBeforeArrived.focus();
    }
    lastActiveBeforeArrived = null;
  };
  const openArrivedModal = () => {
    if (!arrivedModalEl) return;
    lastActiveBeforeArrived = document.activeElement;
    arrivedModalEl.removeAttribute("hidden");
    arrivedCloseEl?.focus?.();
  };
  arrivedCloseEl?.addEventListener("click", closeArrivedModal);
  arrivedModalEl?.addEventListener("click", (e) => {
    if (e.target?.getAttribute?.("data-close") === "true") closeArrivedModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && arrivedModalEl && !arrivedModalEl.hasAttribute("hidden")) {
      closeArrivedModal();
    }
  });

  // -------- Tooltip rendering --------
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

  const formatRating = (ratingData) => {
    if (!ratingData) return "";
    const avg = ratingData["ratings-average"] || "";
    const count = ratingData["reviews-count"] || "";
    if (!avg && !count) return "";
    if (!avg) return `${count} reviews`;
    if (!count) return `${avg} ⭐`;
    return `${avg} ⭐ (${count} reviews)`;
  };

  const showPoiTooltip = (poi, screenX, screenY) => {
    if (!poiTooltipEl || !floorMapEl) return;

    const parts = [];

    if (poi.website && poi.website.trim() !== "") {
      const websiteUrl = poi.website.trim();
      const href = websiteUrl.startsWith("http://") || websiteUrl.startsWith("https://")
        ? websiteUrl
        : `https://${websiteUrl}`;
      parts.push(`<div class="tooltip-row"><strong>Website:</strong> <a href="${href}" target="_blank" rel="noopener noreferrer" class="tooltip-link">${poi.website}</a></div>`);
    }

    const workingHours = formatWorkingHours(poi.working_hours);
    if (workingHours) {
      parts.push(`<div class="tooltip-row"><strong>Hours:</strong> ${workingHours}</div>`);
    }

    const rating = formatRating(poi.rating_data);
    if (rating) {
      parts.push(`<div class="tooltip-row"><strong>Rating:</strong> ${rating}</div>`);
    }

    if (poi.is_open !== undefined && poi.is_open !== null) {
      parts.push(`<div class="tooltip-row"><strong>Status:</strong> ${poi.is_open ? "Open" : "Closed"}</div>`);
    }

    if (parts.length === 0) return;

    const imageUrl = poi.images && poi.images.length > 0 && poi.images[0].url ? poi.images[0].url : null;
    const imageHtml = imageUrl ? `<img src="${imageUrl}" alt="${poi.display_name}" class="tooltip-image" />` : "";

    poiTooltipEl.innerHTML = `
      ${imageHtml}
      <div class="tooltip-content">
        <div class="tooltip-title">${poi.display_name}</div>
        ${parts.join("")}
      </div>
    `;

    const container = floorMapEl.parentElement;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();

    const tooltipWidth = 280;
    const tooltipHeight = 100;
    const offsetX = 25;
    const offsetY = -tooltipHeight / 2;

    let tooltipX = screenX - containerRect.left + offsetX;
    let tooltipY = screenY - containerRect.top + offsetY;

    if (tooltipX + tooltipWidth > containerRect.width - 10) {
      tooltipX = screenX - containerRect.left - tooltipWidth - offsetX;
    }

    if (tooltipX < 10) {
      tooltipX = screenX - containerRect.left + offsetX;
    }

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

  const cancelTooltipHide = () => {
    if (tooltipHideTimeout) {
      clearTimeout(tooltipHideTimeout);
      tooltipHideTimeout = null;
    }
  };

  if (poiTooltipEl) {
    poiTooltipEl.addEventListener("mouseenter", () => {
      cancelTooltipHide();
    });
    poiTooltipEl.addEventListener("mouseleave", () => {
      hidePoiTooltip(100);
    });
  }

  const mapContainer = host.querySelector(".map-container");
  if (mapContainer) {
    mapContainer.addEventListener("click", (e) => {
      if (!e.target.closest(".poi-marker-group") && !e.target.closest(".poi-tooltip")) {
        hidePoiTooltip(0);
      }
    });
  }

  // -------- Map geometry + drawing --------
  // Uses an approximate local meter conversion for short indoor segments.
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const latMeters = (lat2 - lat1) * 111000;
    const lonMeters = (lon2 - lon1) * 66000;
    return Math.sqrt(latMeters * latMeters + lonMeters * lonMeters);
  };

  const boundaryInset = 30;
  const poiAreaWidth = 380 - boundaryInset * 2;
  const poiAreaHeight = 280 - boundaryInset * 2;
  const poiAreaX = 10 + boundaryInset;
  const poiAreaY = 10 + boundaryInset;

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
      x: ((poi.location.longitude - minLon) / lonRange) * poiAreaWidth + poiAreaX,
      y: ((maxLat - poi.location.latitude) / latRange) * poiAreaHeight + poiAreaY
    }));

    return { pois: normalized, minLat, maxLat, minLon, maxLon };
  };

  const drawFloorMap = ({
    poiData,
    buildingId,
    floorId,
    startId,
    endId,
    segmentFromId = null,
    segmentToId = null,
    highlightIds = [],
    currentPositionPoiId = null
  }) => {
    floorMapEl.innerHTML = "";
    const { pois } = normalizeCoordinates(poiData, buildingId, floorId);

    if (pois.length === 0) {
      floorMapEl.innerHTML = `<text x="200" y="150" text-anchor="middle" fill="#98a0b3" font-size="14">No POIs on this floor</text>`;
      return;
    }

    const boundaryRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    boundaryRect.setAttribute("x", "10");
    boundaryRect.setAttribute("y", "10");
    boundaryRect.setAttribute("width", "380");
    boundaryRect.setAttribute("height", "280");
    boundaryRect.setAttribute("fill", "none");
    boundaryRect.setAttribute("stroke", "#94a3b8");
    boundaryRect.setAttribute("stroke-width", "2");
    boundaryRect.setAttribute("stroke-dasharray", "4 2");
    floorMapEl.appendChild(boundaryRect);

    const floorLabelGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const labelText = `Building ${buildingId}, Floor ${floorId}`;
    const boxPadding = 6;
    const boxHeight = 16;
    const boxWidth = Math.min(labelText.length * 5.5 + boxPadding * 2, 140);
    const floorLabelBox = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    floorLabelBox.setAttribute("x", "12");
    floorLabelBox.setAttribute("y", "12");
    floorLabelBox.setAttribute("width", String(boxWidth));
    floorLabelBox.setAttribute("height", String(boxHeight));
    floorLabelBox.setAttribute("rx", "4");
    floorLabelBox.setAttribute("ry", "4");
    floorLabelBox.setAttribute("fill", "#f1f5f9");
    floorLabelBox.setAttribute("stroke", "#cbd5e1");
    floorLabelBox.setAttribute("stroke-width", "1");
    floorLabelGroup.appendChild(floorLabelBox);
    const floorLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    floorLabel.setAttribute("x", String(12 + boxPadding));
    floorLabel.setAttribute("y", String(12 + boxHeight / 2 + 3));
    floorLabel.setAttribute("text-anchor", "start");
    floorLabel.setAttribute("font-size", "8");
    floorLabel.setAttribute("fill", "#64748b");
    floorLabel.textContent = labelText;
    floorLabelGroup.appendChild(floorLabel);
    floorMapEl.appendChild(floorLabelGroup);

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

    if (currentPositionPoiId) {
      const currentPoi = pois.find((p) => String(p.id) === String(currentPositionPoiId));
      if (currentPoi) {
        const youAreHereCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        youAreHereCircle.setAttribute("cx", currentPoi.x);
        youAreHereCircle.setAttribute("cy", currentPoi.y);
        youAreHereCircle.setAttribute("r", "18");
        youAreHereCircle.setAttribute("fill", "none");
        youAreHereCircle.setAttribute("stroke", "#10b981");
        youAreHereCircle.setAttribute("stroke-width", "3");
        floorMapEl.appendChild(youAreHereCircle);
      }
    }

    pois.forEach((poi) => {
      const isStart = String(poi.id) === String(startId);
      const isEnd = String(poi.id) === String(endId);
      const isHighlighted = highlightIds.some((id) => String(id) === String(poi.id));
      const isRoute = isStart || isEnd || isHighlighted;

      const poiGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      poiGroup.setAttribute("class", "poi-marker-group");
      poiGroup.setAttribute("data-poi-id", poi.id);
      poiGroup.setAttribute(
        "aria-label",
        `${poi.display_name || "Location"}, Building ${poi.building_id}, Floor ${poi.floor_id}, ${getPoiTypeName(poi) || "category"}`
      );

      const showTooltipForPoi = () => {
        if (!poiTooltipEl || !floorMapEl) return;

        cancelTooltipHide();
        const svgPoint = floorMapEl.createSVGPoint();
        svgPoint.x = poi.x;
        svgPoint.y = poi.y;
        const ctm = floorMapEl.getScreenCTM();
        if (!ctm) return;

        const screenPoint = svgPoint.matrixTransform(ctm);
        showPoiTooltip(poi, screenPoint.x, screenPoint.y);
      };

      poiGroup.addEventListener("mouseenter", showTooltipForPoi);
      poiGroup.addEventListener("mouseleave", () => hidePoiTooltip(100));
      poiGroup.addEventListener("click", (e) => {
        e.stopPropagation();
        showTooltipForPoi();
      });

      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", poi.x);
      circle.setAttribute("cy", poi.y);
      circle.setAttribute("r", isStart || isEnd ? "8" : isHighlighted ? "7" : "5");
      circle.setAttribute("fill", isStart ? "#10b981" : isEnd ? "#ef4444" : "#6b7280");
      circle.setAttribute("stroke", isHighlighted ? "#6d28d9" : "#fff");
      circle.setAttribute("stroke-width", isHighlighted ? "3" : "2");
      poiGroup.appendChild(circle);

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

  // -------- Route planning --------
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

  const ordinal = (n) => {
    const num = Number(n);
    const s = String(num);
    if (s.endsWith("11") || s.endsWith("12") || s.endsWith("13")) return `${num}th`;
    if (s.endsWith("1")) return `${num}st`;
    if (s.endsWith("2")) return `${num}nd`;
    if (s.endsWith("3")) return `${num}rd`;
    return `${num}th`;
  };

  const distanceBetweenPois = (a, b) =>
    calculateDistance(a.location.latitude, a.location.longitude, b.location.latitude, b.location.longitude);

  const buildBuildingGraph = (poiData) => {
    const adjacency = new Map();

    const connectors = poiData.filter((p) => isConnector(p) && String(p.display_name || "").trim() !== "");
    const byName = new Map();
    connectors.forEach((p) => {
      const name = String(p.display_name).trim();
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name).push(p);
    });

    const addEdge = (a, b, name) => {
      if (!adjacency.has(a)) adjacency.set(a, new Map());
      if (!adjacency.has(b)) adjacency.set(b, new Map());
      // Keep first connector if multiple exist, this is added as an assumption in the readme.
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

    const prev = new Map();
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

    const steps = [];
    let distanceMeters = 0;
    let requiresStairs = false;

    if (fromFloorId === toFloorId) {
      const segDist = distanceBetweenPois(fromPoi, toPoi);
      steps.push({
        kind: "go",
        text: `Move to the ${toPoi.display_name} point.`,
        distanceMeters: segDist,
        mapView: {
          buildingId,
          floorId: fromFloorId,
          fromPoiId: String(fromPoi.id),
          toPoiId: String(toPoi.id),
          highlightIds: [String(fromPoi.id), String(toPoi.id)]
        }
      });
      distanceMeters += segDist;
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

    const floorAdjacency = new Map(allFloors.map((f) => [f, []]));

    const addFloorEdge = (from, to, kind) => {
      if (!floorAdjacency.has(from)) floorAdjacency.set(from, []);
      floorAdjacency.get(from).push({ toFloorId: String(to), kind });
    };

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

    // Stairs are penalized to strongly prefer elevator paths when both are available.
    const edgeWeight = (kind) => (kind === "ELEVATOR" ? 1 : 100) + 0.1;

    const dist = new Map(allFloors.map((f) => [f, Number.POSITIVE_INFINITY]));
    const prev = new Map();
    const unvisited = new Set(allFloors);

    dist.set(fromFloorId, 0);
    prev.set(fromFloorId, null);

    while (unvisited.size > 0) {
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
          reason: `Can't create an indoor route: missing ${edge.kind.toLowerCase()} on Floor ${edge.fromFloorId} or Floor ${edge.toFloorId} in Building ${buildingId}.`
        };
      }

      const fromConnector = pickNearest(fromConnectors, currentPoi);
      const toConnector = pickNearest(toConnectors, toPoi);

      if (String(currentPoi.id) !== String(fromConnector.id)) {
        const segDist = distanceBetweenPois(currentPoi, fromConnector);
        steps.push({
          kind: "go",
          text: `Go to ${fromConnector.display_name}.`,
          distanceMeters: segDist,
          mapView: {
            buildingId,
            floorId: edge.fromFloorId,
            fromPoiId: String(currentPoi.id),
            toPoiId: String(fromConnector.id),
            highlightIds: [String(currentPoi.id), String(fromConnector.id)]
          }
        });
        distanceMeters += segDist;
      }

      const verb = edge.kind === "ELEVATOR" ? "Take the elevator" : "Use the stairs";
      const floorDist = floorDistanceMeters(edge.fromFloorId, edge.toFloorId);
      steps.push({
        kind: edge.kind === "ELEVATOR" ? "elevator" : "stairs",
        text: `${verb} to the ${ordinal(edge.toFloorId)} floor.`,
        distanceMeters: floorDist,
        mapView: {
          buildingId,
          floorId: edge.fromFloorId,
          fromPoiId: String(fromConnector.id),
          toPoiId: String(fromConnector.id),
          highlightIds: [String(fromConnector.id)]
        }
      });
      distanceMeters += floorDist;
      if (edge.kind === "STAIRS") requiresStairs = true;

      currentPoi = toConnector;
    }

    if (String(currentPoi.id) !== String(toPoi.id)) {
      const segDist = distanceBetweenPois(currentPoi, toPoi);
      steps.push({
        kind: "go",
        text: `Move to the ${toPoi.display_name} point.`,
        distanceMeters: segDist,
        mapView: {
          buildingId,
          floorId: toFloorId,
          fromPoiId: String(currentPoi.id),
          toPoiId: String(toPoi.id),
          highlightIds: [String(currentPoi.id), String(toPoi.id)]
        }
      });
      distanceMeters += segDist;
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

    const graph = buildBuildingGraph(poiData);
    const path = findBuildingPath(graph, startBuildingId, endBuildingId);
    if (!path) {
      return {
        ok: false,
        reason: `Can't create an indoor route between Building ${startBuildingId} and Building ${endBuildingId}: no connector links these buildings.`
      };
    }

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

      let connectorFrom = fromCandidates[0];
      let best = Number.POSITIVE_INFINITY;
      for (const c of fromCandidates) {
        const d = distanceBetweenPois(currentPoi, c);
        if (d < best) {
          best = d;
          connectorFrom = c;
        }
      }

      const sameFloor = toCandidates.find((c) => String(c.floor_id) === String(connectorFrom.floor_id));
      const connectorTo = sameFloor || toCandidates[0];

      const within = routeWithinBuilding({ poiData, fromPoi: currentPoi, toPoi: connectorFrom });
      if (!within.ok) return { ok: false, reason: within.reason };
      steps.push(...within.steps);
      distanceMeters += within.distanceMeters;
      if (within.requiresStairs) requiresStairs = true;

      const connectorDist = distanceBetweenPois(connectorFrom, connectorTo);
      steps.push({
        kind: "connector",
        text: `Take '${connectorName}' to Building ${toBuildingId}.`,
        distanceMeters: connectorDist,
        mapView: {
          buildingId: String(connectorTo.building_id),
          floorId: String(connectorTo.floor_id),
          fromPoiId: String(connectorTo.id),
          toPoiId: String(connectorTo.id),
          highlightIds: [String(connectorTo.id)]
        }
      });
      distanceMeters += connectorDist;

      currentPoi = connectorTo;
    }

    const finalWithin = routeWithinBuilding({ poiData, fromPoi: currentPoi, toPoi: endPoi });
    if (!finalWithin.ok) return { ok: false, reason: finalWithin.reason };
    steps.push(...finalWithin.steps);
    distanceMeters += finalWithin.distanceMeters;
    if (finalWithin.requiresStairs) requiresStairs = true;

    return { ok: true, steps, distanceMeters, requiresStairs };
  };

  // -------- Step navigation --------
  let activeStepIndex = 0;
  let arrived = false;
  let currentPlan = null;

  const drawCurrentPlanMapView = (mapView, currentPositionPoiId) => {
    if (!currentPlan || !mapView) return;
    drawFloorMap({
      poiData: currentPlan.poiData,
      buildingId: mapView.buildingId,
      floorId: mapView.floorId,
      startId: currentPlan.startId,
      endId: currentPlan.endId,
      segmentFromId: mapView.fromPoiId,
      segmentToId: mapView.toPoiId,
      highlightIds: mapView.highlightIds || [],
      currentPositionPoiId
    });
  };

  const resetStepState = ({ clearDistance = true } = {}) => {
    currentPlan = null;
    activeStepIndex = 0;
    arrived = false;
    if (routeStepBoxEl) routeStepBoxEl.style.display = "none";
    if (routeStepsPanelEl) routeStepsPanelEl.setAttribute("hidden", "");
    if (clearDistance && distanceValueEl) distanceValueEl.textContent = "-";
  };

  const syncRouteInfo = (startPoi, endPoi) => {
    startNameEl.textContent = startPoi ? startPoi.display_name : "-";
    startDetailsEl.textContent = startPoi
      ? `Building ${startPoi.building_id}, Floor ${startPoi.floor_id}`
      : "-";
    endNameEl.textContent = endPoi ? endPoi.display_name : "-";
    endDetailsEl.textContent = endPoi ? `Building ${endPoi.building_id}, Floor ${endPoi.floor_id}` : "-";
  };

  const getDefaultMapTarget = (startPoi, endPoi) => {
    if (endPoi) {
      return {
        buildingId: String(endPoi.building_id),
        floorId: String(endPoi.floor_id)
      };
    }

    if (startPoi) {
      return {
        buildingId: String(startPoi.building_id),
        floorId: String(startPoi.floor_id)
      };
    }

    return { buildingId: "", floorId: "" };
  };

  const drawSelectionMap = ({ poiData, buildingId, floorId, startId, endId, emptyMessage = "" }) => {
    if (buildingId && floorId) {
      drawFloorMap({
        poiData,
        buildingId,
        floorId,
        startId: startId || null,
        endId: endId || null
      });
      return;
    }

    if (emptyMessage) {
      floorMapEl.innerHTML = `<text x="200" y="150" text-anchor="middle" fill="#98a0b3" font-size="14">${emptyMessage}</text>`;
    }
  };

  const handleStepPrev = () => {
    const steps = currentPlan?.steps || [];
    if (steps.length === 0 || activeStepIndex <= 0) return;
    if (arrived) {
      arrived = false;
    }
    activeStepIndex--;
    renderSteps();
    const map = steps[activeStepIndex]?.mapView;
    drawCurrentPlanMapView(map, map?.fromPoiId);
  };

  const handleStepNext = () => {
    const steps = currentPlan?.steps || [];
    if (steps.length === 0) return;
    const isLast = activeStepIndex === steps.length - 1;
    if (isLast) {
      arrived = true;
      openArrivedModal();
      renderSteps();
      const lastMap = steps[steps.length - 1]?.mapView;
      drawCurrentPlanMapView(lastMap, lastMap?.toPoiId);
    } else {
      activeStepIndex++;
      renderSteps();
      const map = steps[activeStepIndex]?.mapView;
      drawCurrentPlanMapView(map, map?.fromPoiId);
    }
  };

  const renderSteps = () => {
    const steps = currentPlan?.steps || [];
    if (!routeStepBoxEl || !routeStepCurrentEl) return;

    if (steps.length === 0) {
      routeStepBoxEl.style.display = "none";
      return;
    }

    routeStepBoxEl.style.display = "flex";
    if (arrived) {
      routeStepCurrentEl.textContent = "You are arrived.";
      if (routeStepPrevEl) routeStepPrevEl.disabled = false;
      if (routeStepNextEl) {
        routeStepNextEl.textContent = "Arrived";
        routeStepNextEl.disabled = true;
      }
    } else {
      const step = steps[activeStepIndex];
      const distSuffix = step.distanceMeters != null ? ` (${Math.round(step.distanceMeters)}m)` : "";
      routeStepCurrentEl.textContent = `${activeStepIndex + 1}. ${step.text}${distSuffix}`;
      if (routeStepPrevEl) routeStepPrevEl.disabled = activeStepIndex === 0;
      if (routeStepNextEl) {
        routeStepNextEl.textContent = "Next";
        routeStepNextEl.disabled = false;
      }
    }
  };

  routeStepPrevEl?.addEventListener("click", handleStepPrev);
  routeStepNextEl?.addEventListener("click", handleStepNext);

  // -------- Public API --------
  const updateRoutePreview = (selection, poiData, showRoute = false) => {
    const { startId, endId } = selection;

    const startPoi = startId ? poiData.find((p) => String(p.id) === String(startId)) : null;
    const endPoi = endId ? poiData.find((p) => String(p.id) === String(endId)) : null;
    const { buildingId: mapBuildingId, floorId: mapFloorId } = getDefaultMapTarget(startPoi, endPoi);
    syncRouteInfo(startPoi, endPoi);

    if (!showRoute) {
      resetStepState();
      if (isModalOpen()) closeErrorModal();
      drawSelectionMap({
        poiData,
        buildingId: mapBuildingId,
        floorId: mapFloorId,
        startId,
        endId,
        emptyMessage: "Select start and destination"
      });
      return;
    }

    if (!startPoi || !endPoi) {
      resetStepState();
      drawSelectionMap({
        poiData,
        buildingId: mapBuildingId,
        floorId: mapFloorId,
        startId,
        endId
      });
      return;
    }

    const plan = buildRoutePlan(poiData, startPoi, endPoi);
    if (!plan.ok) {
      resetStepState();
      openErrorModal(plan.reason);
      drawSelectionMap({
        poiData,
        buildingId: String(startPoi.building_id),
        floorId: String(startPoi.floor_id),
        startId,
        endId
      });
      return;
    }

    if (isModalOpen()) closeErrorModal();

    if (routeStepsPanelEl) routeStepsPanelEl.removeAttribute("hidden");
    currentPlan = {
      poiData,
      startId: String(startPoi.id),
      endId: String(endPoi.id),
      steps: plan.steps
    };
    activeStepIndex = 0;
    arrived = false;
    renderSteps();

    distanceValueEl.textContent = `${Math.round(plan.distanceMeters)}m`;

    const first = plan.steps[0]?.mapView;
    if (first) {
      drawCurrentPlanMapView(first, first.fromPoiId);
    } else {
      drawSelectionMap({
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