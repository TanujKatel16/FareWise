const crypto = require('node:crypto');
const places = require('../data/places.json');
const db = require('../config/database');
const { googleMapsApiKey } = require('../config/env');
const { distanceKm } = require('./geography.service');
function googlePhotoUrl(photoName) {
  return '/api/places/photo?name=' + encodeURIComponent(photoName);
}

function mapGooglePlace(place, point) {
  const location = place.location || {};
  const photos = place.photos || [];
  return {
    id: place.id,
    name: place.displayName?.text || 'Nearby place',
    city: place.shortFormattedAddress || place.formattedAddress || 'Nearby',
    state: '',
    lat: location.latitude,
    lng: location.longitude,
    category: (place.types || []).includes('restaurant') ? 'Food & drink' : 'Nearby favourite',
    description: place.editorialSummary?.text || place.formattedAddress || 'A place close to you.',
    rating: place.rating || null,
    review_count: place.userRatingCount || 0,
    rating_source: 'Google Maps',
    reviews: (place.reviews || []).slice(0, 3).map((review) => ({
      author: review.authorAttribution?.displayName || 'Google Maps reviewer',
      rating: review.rating,
      text: review.text?.text || review.originalText?.text || '',
      attribution: 'Google Maps',
      review_url: review.googleMapsUri,
    })),
    image: photos[0] ? googlePhotoUrl(photos[0].name) : null,
    image_attribution: photos[0]?.authorAttributions?.map((item) => item.displayName).join(', '),
    image_source: 'Google Maps',
    maps_url: place.googleMapsUri,
    distance_km: distanceKm(point, { lat: location.latitude, lng: location.longitude }),
    source: 'google',
  };
}

async function googleNearby(lat, lng, radiusKm) {
  const point = { lat, lng };
  const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    signal: AbortSignal.timeout(9000),
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': googleMapsApiKey(),
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.shortFormattedAddress,places.location,places.types,places.rating,places.userRatingCount,places.editorialSummary,places.reviews,places.photos,places.googleMapsUri,places.reviews.googleMapsUri',
    },
    body: JSON.stringify({
      includedTypes: ['tourist_attraction'],
      maxResultCount: 20,
      rankPreference: 'POPULARITY',
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: Math.min(50000, radiusKm * 1000),
        },
      },
    }),
  });
  if (!response.ok) throw new Error('Google Places request failed (' + response.status + ')');
  const body = await response.json();
  return (body.places || []).map((place) => mapGooglePlace(place, point));
}

async function communityReviews(placeId) {
  return (await db.many('place_reviews')).filter((review) => review.place_id === placeId);
}

async function nearby({ lat, lng, radiusKm = 80, city } = {}) {
  if (Number.isFinite(lat) && Number.isFinite(lng) && googleMapsApiKey()) {
    try {
      const results = await googleNearby(lat, lng, radiusKm);
      for (const place of results) {
        const reviews = await communityReviews(place.id);
        place.community_review_count = reviews.length;
        place.reviews.unshift(
          ...reviews
            .slice(-2)
            .reverse()
            .map((review) => ({
              author: review.name || 'Farewise traveller',
              rating: Number(review.rating),
              text: review.text,
              image: review.evidence_url,
              attribution: 'Farewise traveller',
            })),
        );
      }
      if (results.length) return { places: results, source: 'google', live: true };
    } catch (error) {
      console.warn('Google Places unavailable; showing regional discovery samples:', error.message);
    }
  }
  const point = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  const enriched = await Promise.all(
    places.map(async (place) => {
      const reviews = await communityReviews(place.id);
      const extraCount = reviews.length;
      const totalRating = reviews.reduce((total, review) => total + Number(review.rating), 0);
      const rating = extraCount
        ? Number(
            (
              (place.demo_rating * place.demo_review_count + totalRating) /
              (place.demo_review_count + extraCount)
            ).toFixed(1),
          )
        : place.demo_rating;
      return {
        ...place,
        rating,
        review_count: place.demo_review_count + extraCount,
        rating_source: 'Farewise demo data',
        reviews: [
          ...reviews
            .slice(-2)
            .reverse()
            .map((review) => ({
              author: review.name || 'Farewise traveller',
              rating: Number(review.rating),
              text: review.text,
              image: review.evidence_url,
              attribution: 'Farewise traveller',
            })),
          {
            author: 'Sample traveller',
            rating: place.demo_rating,
            text: place.demo_review,
            attribution: 'Farewise demo review',
          },
        ],
        image: place.image_url || null,
        image_attribution: place.image_attribution || '',
        image_license: place.image_license || '',
        image_license_url: place.image_license_url || '',
        image_source: 'Wikimedia Commons',
        maps_url:
          'https://www.google.com/maps/search/?api=1&query=' +
          encodeURIComponent(place.name + ', ' + place.city),
        distance_km: point ? distanceKm(point, place) : Number.POSITIVE_INFINITY,
        source: 'demo',
      };
    }),
  );
  let filtered = enriched;
  if (city && city !== 'all' && city !== 'current')
    filtered = filtered.filter((place) => place.city === city);
  filtered.sort((a, b) => a.distance_km - b.distance_km);
  if (point) {
    const inRange = filtered.filter((place) => place.distance_km <= radiusKm);
    filtered = inRange.length ? inRange : filtered.slice(0, 8);
  }
  return { places: filtered.slice(0, 12), source: 'demo', live: false };
}

async function photo(photoName, maxHeight = 720) {
  if (!googleMapsApiKey() || !/^places\/[^/]+\/photos\/[^/]+$/.test(photoName || '')) {
    const error = new Error('Invalid Google photo reference');
    error.status = 400;
    throw error;
  }
  const url = new URL('https://places.googleapis.com/v1/' + photoName + '/media');
  url.searchParams.set('maxHeightPx', String(Math.min(1200, Math.max(100, maxHeight))));
  const response = await fetch(url, {
    headers: { 'X-Goog-Api-Key': googleMapsApiKey() },
    redirect: 'follow',
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('Google photo request failed');
  return {
    bytes: Buffer.from(await response.arrayBuffer()),
    type: response.headers.get('content-type') || 'image/jpeg',
  };
}

async function createReview(input) {
  const known = places.find((place) => place.id === input.place_id);
  const validGoogleId = /^[A-Za-z0-9_-]{5,200}$/.test(input.place_id || '');
  if (!known && !validGoogleId) {
    const error = new Error('Choose a supported place.');
    error.status = 400;
    throw error;
  }
  const review = {
    ...input,
    id: input.id || crypto.randomUUID(),
    place_name: known?.name || String(input.place_name || 'Nearby place').slice(0, 160),
    created_at: new Date().toISOString(),
  };
  return db.insert('place_reviews', review);
}

module.exports = { nearby, photo, createReview };
