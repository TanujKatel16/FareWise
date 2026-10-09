import { api, escapeHtml } from './api.js';
import { state } from './state.js';
import { nearestCity } from './location.js';
import { selectMapPin } from './route-search.js';

function cityCenter(cityName) {
  const city = state.config.cities.find((item) => item.name === cityName) || state.config.cities[0];
  return [city.lat, city.lng];
}

export function initializeMap() {
  if (state.map || !window.L) return;
  const center = state.currentPosition
    ? [state.currentPosition.lat, state.currentPosition.lng]
    : cityCenter(document.querySelector('#mapCity').value);
  state.map = L.map('map', { scrollWheelZoom: false }).setView(center, 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
  }).addTo(state.map);
  state.map.on('click', (event) => {
    if (state.pinMode) selectMapPin({ lat: event.latlng.lat, lng: event.latlng.lng });
  });
}

export async function loadMapData() {
  if (!state.map || !window.L) return;
  const city = document.querySelector('#mapCity').value;
  const service = document.querySelector('#mapService').value;
  const nearby = state.currentPosition
    ? nearestCity(state.currentPosition.lat, state.currentPosition.lng)
    : null;
  const nearbyMode = Boolean(nearby && nearby.city.name === city && nearby.distance <= 60);
  const query = new URLSearchParams({ city, service });
  if (nearbyMode) {
    query.set('lat', state.currentPosition.lat);
    query.set('lng', state.currentPosition.lng);
    query.set('radius_km', '60');
  }
  try {
    const reports = await api('/api/map-data?' + query.toString());
    state.mapMarkers.forEach((marker) => state.map.removeLayer(marker));
    state.mapMarkers = [];
    if (state.locationMarker) state.map.removeLayer(state.locationMarker);
    reports.forEach((report) => {
      const color = report.severity >= 4 ? '#d66e5a' : '#dfa84f';
      const marker = L.circleMarker([report.lat, report.lng], {
        radius: 7 + Math.min(10, report.report_count / 6),
        color,
        fillColor: color,
        fillOpacity: 0.58,
        weight: 2,
      }).addTo(state.map);
      marker.bindPopup(
        '<strong>' +
          escapeHtml(report.title) +
          '</strong><br>' +
          escapeHtml(report.location) +
          '<br>' +
          escapeHtml(report.report_count) +
          ' traveler reports' +
          '<br>Typical overcharge: about ' +
          escapeHtml(report.typical_overcharge_pct || 20) +
          '%',
      );
      marker.on('click', () => showTrap(report));
      state.mapMarkers.push(marker);
    });
    if (nearbyMode) {
      state.locationMarker = L.marker([state.currentPosition.lat, state.currentPosition.lng])
        .addTo(state.map)
        .bindPopup('Your current location');
    }
    document.querySelector('#mapTotal').textContent = reports.length;
    const status = document.querySelector('#mapLocationStatus');
    if (state.currentPosition && !nearbyMode) {
      status.textContent =
        'Closest community coverage: ' +
        city +
        ' · ' +
        Math.round(nearby.distance) +
        ' km from your location.';
      state.map.setView(cityCenter(city), 11);
    } else {
      status.textContent = nearbyMode
        ? 'Showing reports around your current location.'
        : 'Choose a city or allow location access.';
      if (reports.length)
        state.map.fitBounds(L.featureGroup(state.mapMarkers).getBounds().pad(0.15));
    }
    renderMapList(reports);
  } catch {
    document.querySelector('#mapList').innerHTML =
      '<p class="empty-state">Map reports are unavailable right now.</p>';
  }
}

function showTrap(report) {
  document.querySelector('#mapList').innerHTML =
    '<article class="trap-card selected-trap">' +
    '<span class="severity">' +
    escapeHtml(report.category.replaceAll('_', ' ')) +
    '</span>' +
    '<h3>' +
    escapeHtml(report.title) +
    '</h3><div class="trap-location">⌖ ' +
    escapeHtml(report.city) +
    ' · ' +
    escapeHtml(report.location) +
    '</div><p>' +
    escapeHtml(report.description) +
    '</p><div class="tip-line"><b>Traveler tip</b><br>' +
    escapeHtml(report.tips) +
    '</div><div class="report-count">About ' +
    escapeHtml(report.typical_overcharge_pct || 20) +
    '% typical overcharge · ' +
    report.report_count +
    ' community reports</div></article>';
}

function renderMapList(reports) {
  const list = document.querySelector('#mapList');
  if (!reports.length) {
    list.innerHTML =
      '<p class="empty-state">No reports match these filters yet. Try another service or city.</p>';
    return;
  }
  list.innerHTML = reports
    .slice(0, 24)
    .map(
      (report) =>
        '<button class="map-item" type="button" data-report-id="' +
        escapeHtml(report.id) +
        '">' +
        '<span class="severity ' +
        (report.severity < 4 ? 'low' : '') +
        '">' +
        (report.severity >= 4 ? 'Higher reports' : 'Community tip') +
        '</span><b>' +
        escapeHtml(report.title) +
        '</b><p>' +
        escapeHtml(report.location) +
        ' · ' +
        escapeHtml(report.report_count) +
        ' reports</p></button>',
    )
    .join('');
  list.querySelectorAll('.map-item').forEach((button, index) => {
    button.addEventListener('click', () => {
      state.map.setView([reports[index].lat, reports[index].lng], 15);
      state.mapMarkers[index]?.openPopup();
      showTrap(reports[index]);
    });
  });
}

export function beginPinMode(field) {
  state.pinMode = field;
  document.dispatchEvent(new CustomEvent('farewise:navigate', { detail: 'map' }));
  const onePlace = ['Guide', 'Restaurant'].includes(state.selectedService);
  document.querySelector('#mapModeHint').textContent = onePlace
    ? 'Place pin mode · Tap the map to set the service location.'
    : field === 'origin'
      ? 'Pickup pin mode · Tap the map where your trip starts.'
      : 'Destination pin mode · Tap the map where your trip ends.';
  document.querySelector('#mapModeHint').classList.add('active');
  document.querySelector('#map').classList.add('pin-mode');
  document.querySelector('#map').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function focusCurrentLocation() {
  if (!state.currentPosition || !state.map) return;
  const nearest = nearestCity(state.currentPosition.lat, state.currentPosition.lng);
  document.querySelector('#mapCity').value = nearest.city.name;
  state.map.setView([state.currentPosition.lat, state.currentPosition.lng], 13);
  loadMapData();
}
