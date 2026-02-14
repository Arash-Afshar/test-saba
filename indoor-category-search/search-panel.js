export function initSearchPanel({ hostId, poiOptions, onSelectionChange, onPreview }) {
  const host = document.querySelector(hostId);
  const startSelect = host.querySelector("#startSelect");
  const endSelect = host.querySelector("#endSelect");
  const previewButton = host.querySelector("#previewButton");

  const populateSelect = (selectEl, options, placeholder) => {
    selectEl.innerHTML = "";
    const placeholderOption = document.createElement("option");
    placeholderOption.value = placeholder.value;
    placeholderOption.textContent = placeholder.label;
    selectEl.appendChild(placeholderOption);

    options.forEach((option) => {
      const opt = document.createElement("option");
      opt.value = option.value;
      opt.textContent = option.label;
      selectEl.appendChild(opt);
    });
  };

  const updatePreviewState = () => {
    const startId = startSelect.value;
    const endId = endSelect.value;
    const hasSelection = startId && endId;
    const isSame = startId && startId === endId;
    previewButton.disabled = !hasSelection || isSame;
  };

  startSelect.addEventListener("change", () => {
    onSelectionChange?.({ startId: startSelect.value, endId: endSelect.value });
    updatePreviewState();
  });

  endSelect.addEventListener("change", () => {
    onSelectionChange?.({ startId: startSelect.value, endId: endSelect.value });
    updatePreviewState();
  });

  previewButton.addEventListener("click", () => onPreview?.());

  populateSelect(startSelect, poiOptions, { value: "", label: "Select start point" });
  populateSelect(endSelect, poiOptions, { value: "", label: "Select destination" });

  updatePreviewState();
}
