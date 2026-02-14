# Indoor Search UX Redesign Plan

## Context

Based on indoor-category-search/README.md: build a usable indoor start/destination experience with category filtering, route preview, responsive design for iPhone-sized devices, and smooth interactions without page reloads.

The current implementation uses inline search inputs with dropdown results. The redesign shifts to **button-triggered picker sheets** with a layout similar to Google Maps.

---

## 1. Search Panel Layout Redesign

Replace the current layout with:

- **From** field: button/input-like control showing current selection or "Choose start"
- **To** field: same, showing "Choose destination" when empty
- **Swap** button: Google Maps-style icon button (swap arrows) positioned **beside** the From/To boxes on the right
- **Clear** actions: per-field clear (X) when a selection exists
- **Preview route** button: enabled only when both start and destination are selected

Layout structure (stacked vertically, swap on the right):

```
[From box - "Choose start" or selected name    ] [Swap icon]
[To box   - "Choose destination" or selected   ]
[Preview route]
```

---

## 2. Picker Sheet UX (Match Map Size)

Picker sheet must match the map container size (not full-screen, not bigger or smaller).

- Sizes to the same dimensions as the map container
- Opens when From or To is tapped; closes on selection, ESC, or backdrop click
- Search input at top
- Single quick-category chips row (ENTRANCE, WASHROOM, ELEVATOR, INFORMATION, FOOD)
- Collapsible filter box: Building, Floor, Category, Type, Open now
- Results: Name, category · Building X · Floor Y, Rating (★ value), Open/Closed (green/red on right)

---

## 3. Accessibility

- Visible labels for From, To, and filters
- Picker: role="dialog", aria-modal="true", focus management, ESC closes
- aria-live region for "N results" and selection announcements

---

## 4. Filter Box (Collapsible)

- Expand/collapse toggle
- Dropdown labels on the box (e.g., "Building: 101")

---

## 5. Route Preview: Steps UI

- One step visible at a time + Next button
- On last step Next: show "You have arrived." popup

---

## 6. Map: Building Boundary Boxes

- Draw rectangle around POI cluster per building/floor

---

## 7. Skywalk Connector for Building 103

- Add Skywalk Connector POI in Building 103, Floor 2 (same display_name for connector graph)

---

## Implementation Order

1. SearchPanel.html
2. search-panel.js
3. styles.css
4. RoutePreview.html
5. route-preview.js
6. data.json
7. app.js
