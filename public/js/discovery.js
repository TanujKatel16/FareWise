import { api, escapeHtml, toast } from './api.js';
import { state } from './state.js';

const stars = (rating) =>
  '★'.repeat(Math.round(rating || 0)) + '☆'.repeat(5 - Math.round(rating || 0));
const distance = (value) =>
  Number.isFinite(value)
    ? value < 1
      ? Math.round(value * 1000) + ' m away'
      : value.toFixed(1) + ' km away'
    : 'India';
const commonsPhotoCache = new Map();

function imageMarkup(place, index) {
  const picture = place.image
    ? '<img src="' +
      escapeHtml(place.image) +
      '" alt="' +
      escapeHtml(place.name) +
      '" loading="lazy" />'
    : '<div class="place-image-art art-' +
      (index % 6) +
      '" data-photo-query="' +
      escapeHtml(place.photo_query || '') +
      '"><span>✳</span><b>' +
      escapeHtml(place.category || 'NORTHEAST INDIA') +
      '</b></div>';
  const credit = place.image_attribution
    ? '<small class="image-credit">Photo: ' +
      escapeHtml(place.image_attribution) +
      (place.image_license
        ? ' · ' +
          (place.image_license_url
            ? '<a href="' +
              escapeHtml(place.image_license_url) +
              '" target="_blank" rel="noopener noreferrer">'
            : '') +
          escapeHtml(place.image_license) +
          (place.image_license_url ? '</a>' : '')
        : '') +
      '</small>'
    : '';
  return (
    '<div class="place-image">' +
    picture +
    '<span class="place-category">' +
    escapeHtml(place.category || 'Local favourite') +
    '</span>' +
    credit +
    '</div>'
  );
}

async function commonsPhoto(query) {
  if (!query) return null;
  if (commonsPhotoCache.has(query)) return commonsPhotoCache.get(query);
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: 'filetype:bitmap ' + query,
    gsrnamespace: '6',
    gsrlimit: '1',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: '960',
    format: 'json',
    origin: '*',
  });
  try {
    const response = await fetch('https://commons.wikimedia.org/w/api.php?' + params);
    if (!response.ok) return null;
    const body = await response.json();
    const image = Object.values(body.query?.pages || {})[0]?.imageinfo?.[0];
    const result = image?.thumburl
      ? {
          url: image.thumburl,
          attribution:
            image.extmetadata?.Artist?.value?.replace(/<[^>]*>/g, '') ||
            'Wikimedia Commons contributor',
          license: image.extmetadata?.LicenseShortName?.value || 'Wikimedia Commons',
          licenseUrl:
            image.extmetadata?.LicenseUrl?.value ||
            'https://commons.wikimedia.org/wiki/Commons:Licensing',
        }
      : null;
    commonsPhotoCache.set(query, result);
    return result;
  } catch {
    return null;
  }
}

async function hydrateCommonsPhotos(grid) {
  await Promise.all(
    [...grid.querySelectorAll('.place-image-art[data-photo-query]')].map(async (placeholder) => {
      const photo = await commonsPhoto(placeholder.dataset.photoQuery);
      if (!photo?.url || !photo.url.startsWith('https://upload.wikimedia.org/')) return;
      const wrapper = placeholder.parentElement;
      const img = document.createElement('img');
      img.src = photo.url;
      img.alt = wrapper.querySelector('.place-category')?.textContent || 'Local destination';
      img.loading = 'lazy';
      placeholder.replaceWith(img);
      if (!photo.attribution) return;
      const credit = document.createElement('small');
      credit.className = 'image-credit';
      credit.append('Photo: ' + photo.attribution + ' · ');
      const license = document.createElement('a');
      license.href = photo.licenseUrl;
      license.target = '_blank';
      license.rel = 'noopener noreferrer';
      license.textContent = photo.license;
      credit.append(license);
      wrapper.append(credit);
    }),
  );
}

function card(place, index) {
  const review = place.reviews?.[0];
  const placeUrl = place.maps_url || '#';
  const reviewLabel =
    place.rating_source === 'Google Maps' ? 'Google Maps' : 'Farewise sample rating';
  return (
    '<article class="place-card">' +
    imageMarkup(place, index) +
    '<div class="place-card-body"><div class="place-title-row"><div><h3>' +
    escapeHtml(place.name) +
    '</h3><div class="place-region">' +
    escapeHtml(place.city) +
    (place.state ? ', ' + escapeHtml(place.state) : '') +
    ' · ' +
    escapeHtml(distance(place.distance_km)) +
    '</div></div><span class="place-rating"><b>' +
    escapeHtml(place.rating || '—') +
    '</b> ★</span></div>' +
    '<div class="place-stars-display" aria-label="' +
    escapeHtml(place.rating || 0) +
    ' out of 5 stars">' +
    stars(place.rating) +
    '<small>' +
    escapeHtml(Number(place.review_count || 0).toLocaleString()) +
    ' · ' +
    reviewLabel +
    '</small></div>' +
    '<p class="place-description">' +
    escapeHtml(place.description || 'A favourite worth discovering nearby.') +
    '</p>' +
    (review
      ? '<blockquote class="place-quote">“' +
        escapeHtml(review.text) +
        '”<small>— ' +
        escapeHtml(review.author || 'Traveller') +
        '</small>' +
        (review.image
          ? '<img class="place-review-photo" src="' +
            escapeHtml(review.image) +
            '" alt="Photo shared by ' +
            escapeHtml(review.author || 'a traveller') +
            '" loading="lazy" />'
          : '') +
        '</blockquote>'
      : '') +
    '<div class="place-card-actions"><button class="text-btn review-this" type="button" data-place-id="' +
    escapeHtml(place.id) +
    '">Write a review</button><a class="text-btn" href="' +
    escapeHtml(placeUrl) +
    '" target="_blank" rel="noopener noreferrer">Open map ↗</a></div></div></article>'
  );
}

function fillReviewSelect(places) {
  const select = document.querySelector('#reviewPlace');
  const selected = select.value;
  select.innerHTML = places
    .map(
      (place) =>
        '<option value="' +
        escapeHtml(place.id) +
        '">' +
        escapeHtml(place.name + ' · ' + place.city) +
        '</option>',
    )
    .join('');
  if (places.some((place) => place.id === selected)) select.value = selected;
}

function pointForDiscovery() {
  if (state.currentPosition && document.querySelector('#discoveryCity').value === 'current')
    return state.currentPosition;
  if (document.querySelector('#discoveryCity').value === 'all') return null;
  const city =
    state.config.cities.find(
      (item) => item.name === document.querySelector('#discoveryCity').value,
    ) || state.config.cities[0];
  return { lat: city.lat, lng: city.lng };
}

export async function loadNearbyPlaces() {
  const grid = document.querySelector('#placeGrid');
  const selector = document.querySelector('#discoveryCity');
  if (!grid || !state.config) return;
  const selectedCity = selector.value;
  const point = pointForDiscovery();
  grid.setAttribute('aria-busy', 'true');
  grid.innerHTML =
    '<div class="place-skeleton"></div><div class="place-skeleton"></div><div class="place-skeleton"></div>';
  try {
    const query = new URLSearchParams({ radius_km: 30, city: selectedCity });
    if (point) {
      query.set('lat', point.lat);
      query.set('lng', point.lng);
    }
    const result = await api('/api/places/nearby?' + query.toString());
    state.places = result.places;
    grid.innerHTML =
      result.places.map(card).join('') ||
      '<div class="places-empty"><span>⌖</span><h3>No places found in this area</h3><p>Try a nearby region, or check back when more local places are added.</p></div>';
    hydrateCommonsPhotos(grid);
    fillReviewSelect(result.places);
    const badge = document.querySelector('#placesSource');
    const note = document.querySelector('#placeDataNote');
    badge.textContent = result.live ? 'Google Maps · live' : 'Community demo samples';
    badge.classList.toggle('live-source', result.live);
    note.classList.toggle('hidden', result.live);
    const cityName =
      selectedCity === 'all'
        ? 'all covered cities'
        : state.config.cities.find((city) => city.name === selectedCity)?.name;
    const usingCurrentPosition = selectedCity === 'current' && !!state.currentPosition;
    document.querySelector('#placesSubtitle').textContent = usingCurrentPosition
      ? 'Closest places to your current location · ' + result.places.length + ' nearby results.'
      : selectedCity === 'all'
        ? 'Explore famous destinations across Assam, the Northeast and Jaipur. Allow location for nearby picks.'
        : 'Showing places near ' + cityName + ' · Allow location for your exact nearby results.';
    const status = document.querySelector('#discoveryLocationStatus');
    if (!usingCurrentPosition)
      status.textContent =
        'Showing regional places near ' + cityName + '. Allow location for results around you.';
    else if (result.live)
      status.textContent = 'Showing live Google Maps places near your current location.';
    else status.textContent = 'Location found. Showing sample places sorted by distance from you.';
    grid.querySelectorAll('.review-this').forEach((button) =>
      button.addEventListener('click', () => {
        document.querySelector('#reviewPlace').value = button.dataset.placeId;
        document
          .querySelector('#writePlaceReview')
          .scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.querySelector('#reviewText').focus({ preventScroll: true });
      }),
    );
  } catch (error) {
    grid.innerHTML =
      '<div class="places-empty"><span>⌖</span><h3>Places are taking a moment</h3><p>' +
      escapeHtml(error.message) +
      '</p><button class="secondary-btn" id="retryPlaces">Try again</button></div>';
    document.querySelector('#retryPlaces')?.addEventListener('click', loadNearbyPlaces);
  } finally {
    grid.setAttribute('aria-busy', 'false');
  }
}

function setRating(value) {
  document.querySelector('#reviewRating').value = value;
  document
    .querySelectorAll('.place-star')
    .forEach((button) =>
      button.classList.toggle('selected', Number(button.dataset.rating) <= value),
    );
  const words = {
    1: 'Not for me',
    2: 'Could be better',
    3: 'Worth a visit',
    4: 'Really liked it',
    5: 'Loved it',
  };
  document.querySelector('#reviewRatingLabel').textContent = words[value] + ' · ' + value + '/5';
}

function readPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function initializeDiscovery() {
  const select = document.querySelector('#discoveryCity');
  select.innerHTML =
    '<option value="all">All covered cities</option><option value="current">My current location</option>' +
    state.config.cities
      .map(
        (city) =>
          '<option value="' +
          escapeHtml(city.name) +
          '">' +
          escapeHtml(city.name + ', ' + city.state) +
          '</option>',
      )
      .join('');
  select.value = state.config.cities.some((city) => city.name === 'Jaipur') ? 'Jaipur' : 'all';
  select.addEventListener('change', () => {
    if (select.value === 'current' && !state.currentPosition) {
      document.dispatchEvent(new Event('farewise:request-location'));
      return;
    }
    loadNearbyPlaces();
  });
  document.querySelector('#discoverLocation').addEventListener('click', () => {
    document.querySelector('#discoveryLocationStatus').textContent =
      'Finding your current location…';
    document.dispatchEvent(new Event('farewise:request-location'));
  });
  document
    .querySelectorAll('.place-star')
    .forEach((button) =>
      button.addEventListener('click', () => setRating(Number(button.dataset.rating))),
    );
  document.querySelector('#placePhoto').addEventListener('change', (event) => {
    document.querySelector('#placePhotoName').textContent = event.target.files[0]?.name || '';
  });
  document.querySelector('#placeReviewForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    const photo = document.querySelector('#placePhoto').files[0];
    if (photo && photo.size > 5 * 1024 * 1024) return toast('Choose a photo smaller than 5 MB.');
    const review = {
      place_id: fields.place_id,
      place_name: state.places.find((place) => place.id === fields.place_id)?.name,
      name: fields.name,
      rating: Number(fields.rating),
      text: fields.text,
    };
    try {
      if (photo) review.photo_data = await readPhoto(photo);
      await api('/api/places/reviews', { method: 'POST', body: JSON.stringify(review) });
      form.reset();
      document.querySelector('#placePhotoName').textContent = '';
      setRating(5);
      await loadNearbyPlaces();
      toast('Thanks! Your photo and review are now part of this place’s Farewise community page.');
    } catch (error) {
      toast(error.message);
    }
  });
}
