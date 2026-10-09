const places = require('../services/places.service');
const { attachEvidence } = require('../services/upload.service');

function coordinates(req) {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return {};
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    const error = new Error('Current coordinates are not valid.');
    error.status = 400;
    throw error;
  }
  return { lat, lng };
}

async function nearby(req, res) {
  const point = coordinates(req);
  const radiusKm = Math.min(50, Math.max(1, Number(req.query.radius_km) || 30));
  res.json(await places.nearby({ ...point, radiusKm, city: req.query.city || undefined }));
}

async function photo(req, res) {
  const image = await places.photo(req.query.name, Number(req.query.height) || 720);
  res.set('Cache-Control', 'private, no-store');
  res.type(image.type).send(image.bytes);
}

async function review(req, res) {
  const input = req.body;
  const rating = Number(input.rating);
  const text = String(input.text || '').trim();
  if (!input.place_id || !Number.isInteger(rating) || rating < 1 || rating > 5 || !text) {
    return res
      .status(400)
      .json({ error: 'Choose a place, give 1–5 stars and add a short review.' });
  }
  if (text.length > 1200)
    return res.status(400).json({ error: 'Reviews must be under 1,200 characters.' });
  const review = {
    place_id: input.place_id,
    place_name: String(input.place_name || '')
      .trim()
      .slice(0, 160),
    rating,
    text,
    name: String(input.name || 'Farewise traveller')
      .trim()
      .slice(0, 80),
  };
  review.id = require('node:crypto').randomUUID();
  await attachEvidence(review);
  const saved = await places.createReview(review);
  res.status(201).json({ ok: true, review: saved });
}

module.exports = { nearby, photo, review };
