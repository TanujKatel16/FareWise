import { state } from './state.js';
import { toast } from './api.js';

export function nearestCity(latitude, longitude) {
  const radians = (value) => (value * Math.PI) / 180;
  return state.config.cities
    .map((city) => {
      const lat = radians(city.lat - latitude);
      const lng = radians(city.lng - longitude);
      const a =
        Math.sin(lat / 2) ** 2 +
        Math.cos(radians(latitude)) * Math.cos(radians(city.lat)) * Math.sin(lng / 2) ** 2;
      return { city, distance: 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) };
    })
    .sort((a, b) => a.distance - b.distance)[0];
}

export function setPickup(point, label) {
  state.origin = point;
  document.querySelector('#origin').value = label;
  document.querySelector('#currentLocation').textContent = 'Pickup set to ' + label + '.';
  updateRouteDistance();
}

export function setDestination(point, label) {
  state.destination = point;
  document.querySelector('#destination').value = label;
  updateRouteDistance();
}

export function updateRouteDistance() {
  const summary = document.querySelector('#routeSummary');
  const onePlace = ['Guide', 'Restaurant'].includes(state.selectedService);
  if (onePlace) {
    summary.textContent = document.querySelector('#origin').value
      ? 'Place selected · no trip distance is needed'
      : 'Choose one place for a local reference estimate';
    return;
  }
  if (!state.origin || !state.destination) {
    summary.textContent = 'Choose both places to estimate distance';
    return;
  }
  const distance = Math.max(0.2, Math.round(haversine(state.origin, state.destination) * 10) / 10);
  document.querySelector('#distance').value = distance;
  summary.textContent = 'Estimated straight-line distance: ' + distance + ' km';
}

function haversine(a, b) {
  const radians = (value) => (value * Math.PI) / 180;
  const lat = radians(b.lat - a.lat),
    lng = radians(b.lng - a.lng);
  const component =
    Math.sin(lat / 2) ** 2 +
    Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(lng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(component), Math.sqrt(1 - component));
}

export function requestCurrentLocation({ onLocated = () => {} } = {}) {
  const status = document.querySelector('#currentLocation');
  if (!navigator.geolocation) {
    status.textContent = 'Location is unavailable in this browser. Choose a city below.';
    return;
  }
  status.textContent = 'Requesting your location…';
  navigator.geolocation.getCurrentPosition(
    (position) => {
      state.currentPosition = { lat: position.coords.latitude, lng: position.coords.longitude };
      const closest = nearestCity(state.currentPosition.lat, state.currentPosition.lng);
      document.querySelector('#city').value = closest.city.name;
      document.querySelector('#mapCity').value = closest.city.name;
      status.textContent =
        'Location found · ' +
        closest.city.name +
        ' coverage is about ' +
        Math.round(closest.distance) +
        ' km away.';
      onLocated();
    },
    () => {
      status.textContent =
        'Location permission is off. Choose a city, or enable location to see nearby data.';
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 },
  );
}

export function useCurrentPickup() {
  if (!state.currentPosition)
    return toast('Allow location access first, or pin your pickup on the map.');
  const point = state.currentPosition;
  setPickup(point, 'My current location');
  toast('Pickup set to your current location.');
}
