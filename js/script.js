

// Load CSV with Papa Parse (header row required)
function loadCsv(filename) {
  return new Promise((resolve, reject) => {
    Papa.parse(filename, {
      download: true,
      header: false,
      dynamicTyping: true,
      skipEmptyLines: true,
      // transform: (value, _) => value?.trim(),
      // complete: ({ data }) => {
      //   const headers = [
      //     "map_name",
      //     "marker_type",
      //     "lat",
      //     "long",
      //     "place_name",
      //     "file_name",
      //     "id",
      //   ];
      //   const objs = data.map((row) =>
      //     Object.fromEntries(headers.map((h, i) => [h, row[i]]))
      //   );
      // },
      complete: (results) => {
        if (results.errors && results.errors.length) {
          console.error("CSV parse errors:", results.errors);
        }
        resolve(results.data);
      },
      error: (err) => reject(err),
    });
  });
}

// Create permanent label tooltip options
function labelOptions() {
  return {
    permanent: true,
    className: "place-label",
    direction: "top",
    offset: [0, -6],
  };
}

(async function main() {
  // 1) Load CSV rows
  const rows = await loadCsv(CSV_FILENAME);

  // Expected CSV headers:
  // Map name, Type of marker, lat, long, place name, map image filename, ID
  // Filter rows for the requested map
  const mapRows = rows.filter(
    (r) => String(r[0]).trim() === String(MAP_NAME).trim()
  );

  if (mapRows.length === 0) {
    console.error(
      `No rows found for map "${MAP_NAME}". Check CSV and query parameter.`
    );
    return;
  }

  // Derive image filename from first row (assuming same for all rows of that map)

  // 2) Initialize simple CRS map for image overlay
  const map = L.map("map", {
    crs: L.CRS.Simple,
    zoomSnap: 0,
    minZoom: -5,
    attributionControl: false,
  });

  // Load the image to determine pixel dimensions if no explicit bounds are known
  const img = new Image();
  img.onload = () => {
    // Define bounds as image pixel space: top-left (0,0), bottom-right (height,width)
    // Leaflet's CRS.Simple treats lat as y and lng as x in this logical space.
    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;

    const bounds = [
      [0, 0],
      [imgH, imgW],
    ];
    console.log(bounds);
    // 3) Add the image overlay and fit
    const overlay = L.imageOverlay(IMAGE_FILE, bounds).addTo(map);
    map.fitBounds(bounds);

    // 4) Add markers with labels
    // Interpret lat/long columns as y/x in the image coordinate system when using CRS.Simple.
    // If coordinates are actual geographic lat/lng, replace CRS.Simple with default CRS and skip image overlay bounds logic.
    mapRows.forEach((r) => {
      const y = Number(r[2]) * SCALE[0];
      const x = Number(r[3]) * SCALE[1];
      const place = String(r[4] || "").trim();
      const type = String(r[1] || "").trim();

      if (Number.isFinite(y) && Number.isFinite(x) && place) {
        const m = L.marker([y, x]).addTo(map);
        m.bindTooltip(place, labelOptions()).openTooltip();
      }
    });
  };
  img.onerror = () => {
    console.log(`Could not load map image: ${IMAGE_FILE}`);
  };
  img.src = IMAGE_FILE;
})();
