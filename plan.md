# Search-first start/end picker UX

## Goal

- Improve start/end selection UX (mobile-first, accessible) while keeping the existing route visualization approach (simple line draw when applicable).
- Support **cross-building** selection (start in one building, destination in another).
- Meet exercise constraints: no external libraries, smooth in-page interactions, iPhone-optimized responsive layout.

## What the data supports (facets)

- **Building**: `building_id`
- **Floor**: `floor_id`
- **Category**: `poi_type.name` (required filter for both endpoints)
- **Type**: parsed from `poi.data` JSON string (`TYPE`) (additional filter)
- **Open now**: `is_open` (additional filter)
- **Disambiguation details to show**: building/floor, address, open/closed, rating, hours, website

## UX design (Option A implementation)

- Replace the current stacked `<select>` controls in `[indoor-category-search/SearchPanel.html](indoor-category-search/SearchPanel.html)` with:
  - **From** field (button/input-like control showing current selection or “Choose start”)
  - **To** field (same)
  - **Swap** and **Clear** actions
  - **Preview route** button enabled only when **both** start and destination are selected
- Tapping From/To opens a **full-screen picker sheet** (mobile-friendly) containing:
  - Search input (text filter)
  - Quick category chips (e.g., ENTRANCE, WASHROOM, ELEVATOR, INFORMATION, FOOD)
  - Filter controls: Building, Floor, Category, Type, Open now
  - Results list: each item is a **button** showing
    - name
    - category · Building X · Floor Y
    - Open/Closed
    - optionally rating/hours when present
- Accessibility specifics
  - Use visible `<label>` text for From/To and filters (not aria-label only)
  - Picker sheet uses `role="dialog"` + `aria-modal="true"`, focuses search on open, returns focus on close, ESC closes
  - Results list uses plain buttons (keyboard + screen reader friendly); optionally add ArrowUp/Down handling as enhancement
  - Use an `aria-live="polite"` region to announce “N results” and “Start set to … / Destination set to …”

## Code-level changes

- `[indoor-category-search/app.js](indoor-category-search/app.js)`
  - Stop constructing/using `buildingOptions` if no longer needed.
  - Pass `INDOOR_POIS` (raw) or mapped `poiOptions` into the new picker logic.
  - Keep map click behavior: first click sets start, second sets destination.
- `[indoor-category-search/search-panel.js](indoor-category-search/search-panel.js)`
  - Replace select-population logic with picker-sheet state machine:
    - `selection = { startId, endId }`
    - `pickerState = { isOpen, activeField: 'start'|'end', query, filters }`
  - Build derived facet lists from POIs (unique buildings, floors per building, categories, types).
  - Implement filtering pipeline:
    - text query matches `display_name` (and optionally address)
    - building/floor/category/type/openNow filters
    - stable sort: best match (query), then building, floor, name
  - Expose API used by map click handlers:
    - `setStart(poiId)` / `setDestination(poiId)` update selection and UI without requiring global building/floor
    - `getCurrentSelection()` returns `{ startId, endId }` (and any additional UI state if needed)
  - Call `onSelectionChange` whenever start/end changes.
- `[indoor-category-search/route-preview.js](indoor-category-search/route-preview.js)`
  - Update `updateRoutePreview(selection, poiData, showRoute)` to **not require** `selection.buildingId`/`floorId`.
  - Derive start/end POIs from ids and compute:
    - start/end labels (building/floor)
    - distance (existing function)
    - summary (existing rules)
  - Map display logic stays: show destination floor if selected, else start floor.
  - Keep route-line drawing behavior unchanged (only draws on currently shown floor when both points exist there).
- `[indoor-category-search/styles.css](indoor-category-search/styles.css)`
  - Add styles for From/To fields, picker sheet overlay, chips, and results list.
  - Ensure 44px touch targets, visible focus outline, and responsive behavior for iPhone portrait/landscape.

## Implementation todos

- Redesign `SearchPanel.html` for From/To fields + actions + picker sheet markup
- Implement search-first picker + filters in `search-panel.js` (query + facet filtering + selection state + map click API)
- Update `route-preview.js` to derive building/floor from selected POIs and work without global building/floor fields
- Add responsive + accessible styling in `styles.css` for the new picker sheet and controls
- Manually verify cross-building selection, preview behavior, and keyboard navigation

## Manual test plan

- iPhone-size portrait and landscape:
  - Open picker, search for a POI, select as start; select a destination from a **different building**.
  - Verify Preview route enables only when both selected; route preview shows names, building/floor, distance.
  - Verify map shows destination floor (or start if no destination).
- Keyboard + screen reader smoke test:
  - Tab to From/To, open dialog, type query, activate a result, close dialog with ESC.
  - Ensure focus returns to the triggering control and selection is announced.

