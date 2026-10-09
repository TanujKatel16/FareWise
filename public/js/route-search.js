import { api, escapeHtml, toast } from './api.js';
import { state } from './state.js';
import { setDestination, setPickup, updateRouteDistance } from './location.js';

function wireSearch(inputId, suggestionId, destination) {
  const input = document.querySelector('#' + inputId);
  const list = document.querySelector('#' + suggestionId);
  let timer;
  input.addEventListener('input', () => {
    if (destination) state.destination = null;
    else state.origin = null;
    updateRouteDistance();
    window.clearTimeout(timer);
    const query = input.value.trim();
    if (query.length < 3) {
      list.replaceChildren();
      list.classList.remove('open');
      return;
    }
    timer = window.setTimeout(async () => {
      try {
        const city = document.querySelector('#city').value;
        const places = await api('/api/geocode?q=' + encodeURIComponent(query + ', ' + city));
        list.innerHTML =
          places
            .map(
              (place, index) =>
                '<button class="suggestion" type="button" data-index="' +
                index +
                '">' +
                '<span class="suggestion-icon">⌖</span><span>' +
                escapeHtml(place.name || place.display_name) +
                '<small>' +
                escapeHtml(place.display_name) +
                '</small></span></button>',
            )
            .join('') ||
          '<p class="suggestion-empty">No places found. You can still enter the route manually.</p>';
        list.classList.add('open');
        list.querySelectorAll('.suggestion').forEach((button) => {
          button.addEventListener('click', () => {
            const place = places[Number(button.dataset.index)];
            const point = { lat: Number(place.lat), lng: Number(place.lon) };
            const label = place.name || place.display_name.split(',').slice(0, 2).join(',');
            input.value = label;
            list.replaceChildren();
            list.classList.remove('open');
            if (destination) setDestination(point, label);
            else setPickup(point, label);
          });
        });
      } catch {
        list.innerHTML =
          '<p class="suggestion-empty">Place search is unavailable. You can still enter the route manually.</p>';
        list.classList.add('open');
      }
    }, 450);
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('#' + suggestionId) && event.target !== input)
      list.classList.remove('open');
  });
}

export function initializeRouteSearch() {
  wireSearch('origin', 'originSuggestions', false);
  wireSearch('destination', 'destinationSuggestions', true);
}

export function selectMapPin(point) {
  if (state.pinMode === 'origin') {
    setPickup(point, 'Pinned pickup · ' + point.lat.toFixed(4) + ', ' + point.lng.toFixed(4));
  } else if (state.pinMode === 'destination') {
    setDestination(
      point,
      'Pinned destination · ' + point.lat.toFixed(4) + ', ' + point.lng.toFixed(4),
    );
  } else {
    return;
  }
  state.pinMode = null;
  document.querySelector('#mapModeHint').classList.remove('active');
  document.querySelector('#map').classList.remove('pin-mode');
  document.dispatchEvent(new CustomEvent('farewise:navigate', { detail: 'check' }));
  toast('Map location added to your route.');
}
