import { api, toast } from './api.js';
import { state } from './state.js';
import { requestCurrentLocation, useCurrentPickup } from './location.js';
import { initializeRouteSearch } from './route-search.js';
import { initializeMap, loadMapData, beginPinMode, focusCurrentLocation } from './map.js';
import { setupPriceCheck } from './price-check.js';
import { initializeNavigation } from './navigation.js';
import { initializeReportForms, loadTrapDatabase, setupTrapFilters } from './reports-and-traps.js';

function fillCitySelect(select, includeAll = false) {
  select.innerHTML =
    (includeAll ? '<option value="">All cities</option>' : '') +
    state.config.cities
      .map(
        (city) =>
          '<option value="' + city.name + '">' + city.name + ', ' + city.state + '</option>',
      )
      .join('');
}

async function initialize() {
  state.config = await api('/api/config');
  document.querySelector('#reportCount').textContent = state.config.price_reports;
  document.querySelector('#trapCount').textContent = state.config.traps;
  document.querySelector('#cityCount').textContent = state.config.cities.length;
  fillCitySelect(document.querySelector('#city'));
  fillCitySelect(document.querySelector('#mapCity'));
  fillCitySelect(document.querySelector('#trapCity'), true);
  document.querySelectorAll('.cities').forEach((select) => fillCitySelect(select));
  document.querySelector('#city').value = 'Guwahati';
  document.querySelector('#mapCity').value = 'Guwahati';
  document.querySelector('#trapCity').value = '';
  document.querySelector('#currency').textContent = state.config.cities[0].currency;

  initializeNavigation();
  initializeRouteSearch();
  setupPriceCheck();
  initializeReportForms();
  setupTrapFilters();
  loadTrapDatabase();

  document.addEventListener('farewise:page', (event) => {
    if (event.detail === 'map') {
      initializeMap();
      window.setTimeout(() => {
        state.map?.invalidateSize();
        loadMapData();
      }, 120);
    }
    if (event.detail === 'traps') loadTrapDatabase();
  });
  document.querySelector('#mapCity').addEventListener('change', loadMapData);
  document.querySelector('#mapService').addEventListener('change', loadMapData);
  document.querySelector('#centerLocation').addEventListener('click', () => {
    if (!state.currentPosition) return requestCurrentLocation({ onLocated: focusCurrentLocation });
    focusCurrentLocation();
  });
  document.querySelector('#pinPickup').addEventListener('click', () => beginPinMode('origin'));
  document
    .querySelector('#pinDestination')
    .addEventListener('click', () => beginPinMode('destination'));
  document.querySelectorAll('[data-demo-price]').forEach((button) => {
    button.addEventListener('click', () => {
      state.origin = null;
      state.destination = null;
      document.querySelector('#city').value = 'Guwahati';
      document.querySelector('#city').dispatchEvent(new Event('change'));
      document.querySelector('.service[data-service="Taxi"]').click();
      document.querySelector('#distance').value = 8;
      document.querySelector('#origin').value = '';
      document.querySelector('#destination').value = '';
      document.querySelector('#quote').value = button.dataset.demoPrice;
      document.querySelector('#routeSummary').textContent = 'Guwahati city sample · 8 km taxi';
      document.querySelector('#checkBtn').focus();
    });
  });
  document.querySelector('#locationBtn').addEventListener('click', () => {
    if (state.currentPosition) return useCurrentPickup();
    requestCurrentLocation({ onLocated: useCurrentPickup });
  });
  document
    .querySelector('#aboutBtn')
    .addEventListener('click', () => document.querySelector('#modal').classList.remove('hidden'));
  document
    .querySelector('#modalClose')
    .addEventListener('click', () => document.querySelector('#modal').classList.add('hidden'));
  document
    .querySelector('#modalDone')
    .addEventListener('click', () => document.querySelector('#modal').classList.add('hidden'));
  document.querySelector('#modal').addEventListener('click', (event) => {
    if (event.target.id === 'modal') event.currentTarget.classList.add('hidden');
  });
  window.addEventListener('farewise:data-updated', refreshCommunityCounts);
  requestCurrentLocation({
    onLocated: () => {
      const city = state.config.cities.find(
        (item) => item.name === document.querySelector('#city').value,
      );
      document.querySelector('#currency').textContent = city?.currency || '₹';
      if (state.map) loadMapData();
    },
  });
}

async function refreshCommunityCounts() {
  try {
    state.config = await api('/api/config');
    document.querySelector('#reportCount').textContent = state.config.price_reports;
    document.querySelector('#trapCount').textContent = state.config.traps;
    await loadMapData();
  } catch {
    toast('Your report was saved, but the community totals could not refresh.');
  }
}

initialize().catch((error) => {
  console.error(error);
  toast('Farewise setup failed: ' + error.message);
});
