import { api, escapeHtml, toast } from './api.js';
import { state } from './state.js';
import { navigate } from './navigation.js';

function money(value, result) {
  return result.currency + Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function setupPriceCheck() {
  document.querySelectorAll('.service').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.service').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      state.selectedService = button.dataset.service;
      updateLocationFields();
    });
  });
  document.querySelector('#city').addEventListener('change', updateCurrency);
  document.querySelector('#checkBtn').addEventListener('click', runPriceCheck);
  setupMagicInput();
  updateLocationFields();
}

function updateLocationFields() {
  const onePlace = ['Guide', 'Restaurant'].includes(state.selectedService);
  document.querySelector('#distanceField').classList.toggle('hidden', onePlace);
  document.querySelector('#routeFields').classList.toggle('single-location', onePlace);
  document.querySelector('#destination').closest('.field').classList.toggle('hidden', onePlace);
  document.querySelector('.route-arrow').classList.toggle('hidden', onePlace);
  document.querySelector('#originLabel').textContent = onePlace ? 'Place' : 'From';
  document.querySelector('#origin').placeholder = onePlace
    ? 'Search a restaurant or meeting point'
    : 'Search a pickup point';
  document.querySelector('#pinDestination').classList.toggle('hidden', onePlace);
  document.querySelector('#pinPickup').textContent = onePlace
    ? '⌖ Pin place on map'
    : '⌖ Pin pickup on map';
  document.querySelector('#routeSummary').textContent = onePlace
    ? 'Guides and restaurants use a local per-person reference'
    : 'Choose both places to estimate distance';
}

function updateCurrency() {
  const city = state.config.cities.find(
    (item) => item.name === document.querySelector('#city').value,
  );
  document.querySelector('#currency').textContent = city?.currency || '₹';
}

async function runPriceCheck() {
  const button = document.querySelector('#checkBtn');
  const quote = Number(document.querySelector('#quote').value);
  if (!quote) {
    document.querySelector('#quote').focus();
    return toast('Add the price you were quoted first.');
  }
  button.disabled = true;
  button.querySelector('span').textContent = 'Checking local prices…';
  const route = {
    city: document.querySelector('#city').value,
    service_type: state.selectedService,
    price_quoted: quote,
    distance_km: Number(document.querySelector('#distance').value) || 5,
    origin: document.querySelector('#origin').value,
    destination: document.querySelector('#destination').value,
  };
  if (state.currentPosition) {
    route.lat = state.currentPosition.lat;
    route.lng = state.currentPosition.lng;
  }
  if (state.origin) route.origin_coords = state.origin;
  if (state.destination) route.destination_coords = state.destination;
  try {
    renderResult(await api('/api/check', { method: 'POST', body: JSON.stringify(route) }));
    navigate('result');
  } catch (error) {
    toast(error.message);
  } finally {
    button.disabled = false;
    button.querySelector('span').textContent = 'Check fairness';
  }
}

function renderResult(result) {
  const color =
    result.verdict === 'Fair'
      ? 'fair'
      : result.verdict === 'Suspicious'
        ? 'suspicious'
        : 'high-risk';
  const icon = result.verdict === 'Fair' ? '✳' : result.verdict === 'Suspicious' ? '⌁' : '!';
  const signals = result.signals
    .map(
      (signal, index) =>
        '<span class="reason-chip">' +
        (index === 0 ? '↗' : index === 1 ? '◉' : '⌖') +
        ' ' +
        escapeHtml(signal) +
        '</span>',
    )
    .join('');
  const nearby = result.nearby_traps
    .map(
      (trap) =>
        '<span class="reason-chip">⚑ ' +
        escapeHtml(trap.report_count) +
        ' reports · ' +
        escapeHtml(trap.location) +
        '</span>',
    )
    .join('');
  const scaleMin = result.fair_mid * 0.5;
  const scaleSpan = Math.max(1, result.fair_mid);
  const percent = (value) => Math.max(0, Math.min(100, ((value - scaleMin) / scaleSpan) * 100));
  const rangeStart = percent(result.fair_low);
  const rangeEnd = percent(result.fair_high);
  const quotePosition = percent(result.quote);
  const onePlace = ['Guide', 'Restaurant'].includes(result.service_type);
  document.querySelector('#resultContent').innerHTML =
    '<div class="result-shell"><div class="result-hero"><div class="verdict-badge ' +
    color +
    '"><div class="badge-inner"><span class="badge-icon">' +
    icon +
    '</span><b>' +
    escapeHtml(result.verdict) +
    '</b><small>PRICE CHECK</small></div></div><div><div class="eyebrow muted">' +
    escapeHtml(result.city.toUpperCase()) +
    ' · ' +
    escapeHtml(result.state.toUpperCase()) +
    ' · ' +
    escapeHtml(result.service_type.toUpperCase()) +
    '</div><h2 class="result-title">' +
    (result.verdict === 'Fair'
      ? 'You’re in a good place.'
      : result.verdict === 'Suspicious'
        ? 'Worth a little pause.'
        : 'This quote looks too high.') +
    '</h2><p class="result-sub">' +
    escapeHtml(result.method) +
    '</p><div class="price-band" style="--quote-position:' +
    Math.round(quotePosition) +
    '%;--low:' +
    Math.round(rangeStart) +
    '%;--high:' +
    Math.round(rangeEnd) +
    '%"><span class="price-pin">Your quote ' +
    money(result.quote, result) +
    '</span></div><div class="price-labels"><span>Baseline ' +
    money(result.baseline, result) +
    '</span><span>Fair range ' +
    money(result.fair_low, result) +
    ' – ' +
    money(result.fair_high, result) +
    '</span><span>Your quote ' +
    money(result.quote, result) +
    '</span></div></div></div><div class="range-card"><div class="range-header"><div>' +
    '<div class="section-kicker">LOCAL FAIR ' +
    (onePlace ? 'PRICE' : 'FARE') +
    ' RANGE</div><div class="range-price">' +
    money(result.fair_low, result) +
    ' — ' +
    money(result.fair_high, result) +
    '</div><div class="range-note">Midpoint ' +
    money(result.fair_mid, result) +
    (onePlace ? ' per service unit · ' : ' · ' + result.distance_km + ' km · ') +
    result.sample_size +
    ' similar reports</div></div><span class="confidence ' +
    result.confidence.toLowerCase() +
    '">' +
    result.confidence +
    ' confidence</span></div><div class="range-note">Reference ' +
    money(result.baseline, result) +
    ' · Community estimate ' +
    money(result.community_estimate, result) +
    '</div></div><div class="why-card"><div class="section-kicker">WHY THIS VERDICT</div><div class="reason-chips">' +
    signals +
    nearby +
    '</div><p class="why-copy">' +
    escapeHtml(result.explanation) +
    '</p></div><div class="negotiation-card"><span class="negotiate-icon">✳</span><div><b>Try a friendly counter</b><p>Counter around <strong>' +
    money(result.counter_at, result) +
    '</strong> · Consider walking away above <strong>' +
    money(result.walk_away_at, result) +
    '</strong></p></div></div><div class="result-actions">' +
    '<button class="primary-btn report-cta" id="resultReport">Share what you paid <span>↗</span></button>' +
    '<button class="secondary-btn" id="againBtn">Check another price</button></div></div>';
  document.querySelector('#resultReport').addEventListener('click', () => {
    navigate('report');
    document.querySelector('.service-select').value = result.service_type;
    document.querySelectorAll('.cities').forEach((item) => {
      item.value = result.city;
    });
    document.querySelector('#reportCity').dispatchEvent(new Event('change'));
  });
  document.querySelector('#againBtn').addEventListener('click', () => navigate('check'));
}

function setupMagicInput() {
  document.querySelector('#magicToggle').addEventListener('click', () => {
    document.querySelector('#magicBox').classList.toggle('hidden');
  });
  document.querySelector('#magicBtn').addEventListener('click', () => {
    const text = document.querySelector('#magicInput').value;
    const price =
      text.match(/(?:said|for|at|cost|quoted)\s*(?:[$€£₹฿]|\s)*([\d,.]+)/i) ||
      text.match(/([\d,.]+)\s*(?:rupees|₹)/i);
    if (price) document.querySelector('#quote').value = price[1].replace(/,/g, '');
    const city = state.config.cities.find((item) => new RegExp(item.name, 'i').test(text));
    if (city) document.querySelector('#city').value = city.name;
    const type = ['taxi', 'tuk-tuk', 'auto', 'guide', 'restaurant', 'tour', 'transfer'].find(
      (item) => text.toLowerCase().includes(item),
    );
    if (type) {
      const name =
        type === 'auto' || type === 'tuk-tuk'
          ? 'Auto / Tuk-tuk'
          : type === 'transfer'
            ? 'Airport transfer'
            : type[0].toUpperCase() + type.slice(1);
      document.querySelectorAll('.service').forEach((button) => {
        if (button.dataset.service.toLowerCase() === name.toLowerCase()) button.click();
      });
    }
    const distance = text.match(/([\d.]+)\s*km/i);
    if (distance) document.querySelector('#distance').value = distance[1];
    updateCurrency();
    toast(price ? 'Quote added. Ready to check!' : 'Could not find a price; enter it above.');
  });
}
