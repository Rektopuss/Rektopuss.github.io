(function initializeStoreMap() {
  'use strict';

  // Leaflet needs a visible container to calculate the map size correctly.
  if (document.getElementById('age-content')?.hidden) {
    document.addEventListener('upene:age-confirmed', initializeStoreMap, { once: true });
    return;
  }

  const container = document.getElementById('store-map');
  const message = document.getElementById('map-message');
  const rows = [...document.querySelectorAll('.store-list li')];
  const reset = document.getElementById('show-all-stores');
  if (!container || !message || !rows.length) return;

  if (!window.L) {
    message.textContent = 'Karti neizdevās ielādēt. Izmanto veikalu adreses un maršrutus sarakstā zemāk.';
    return;
  }

  const map = L.map(container, { scrollWheelZoom: false });
  const points = rows.map(row => [Number(row.dataset.lat), Number(row.dataset.lng)]);
  const bounds = L.latLngBounds(points);
  const fitStores = () => map.fitBounds(bounds, { padding: [35, 35], maxZoom: 12 });
  fitStores();

  const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  });
  tiles.on('tileerror', () => {
    message.hidden = false;
    message.textContent = 'Kartes fonu neizdevās ielādēt. Izmanto veikalu adreses un maršrutus sarakstā zemāk.';
  });
  tiles.on('tileload', () => { message.hidden = true; });
  tiles.addTo(map);
  message.hidden = true;

  rows.forEach((row, index) => {
    const name = row.querySelector('strong').textContent;
    const retailer = row.dataset.retailer;
    const storeTitle = retailer && retailer !== name ? `${retailer} · ${name}` : name;
    const select = row.querySelector('.store-select');
    const popup = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = storeTitle;
    const address = document.createElement('p');
    address.textContent = row.querySelector('.store-address').textContent;
    const directions = row.querySelector('.directions').cloneNode(true);
    popup.append(title, address, directions);

    const marker = L.marker(points[index], {
      title: storeTitle,
      alt: storeTitle,
      icon: L.icon({
        className: 'store-pin',
        iconUrl: './assets/store-pin.svg',
        iconSize: [30, 37],
        iconAnchor: [15, 36],
        popupAnchor: [0, -32]
      })
    }).addTo(map).bindPopup(popup);

    marker.on('popupopen', () => {
      rows.forEach(item => item.querySelector('.store-select').setAttribute('aria-pressed', String(item === row)));
    });
    marker.on('popupclose', () => { select.setAttribute('aria-pressed', 'false'); });
    select.disabled = false;
    select.setAttribute('aria-pressed', 'false');
    select.addEventListener('click', () => {
      map.setView(points[index], 15, { animate: false });
      marker.openPopup();
    });
  });

  reset.hidden = false;
  reset.addEventListener('click', () => {
    map.closePopup();
    fitStores();
  });
  if (window.ResizeObserver) new ResizeObserver(() => {
    map.invalidateSize({ pan: false });
  }).observe(container);
})();
