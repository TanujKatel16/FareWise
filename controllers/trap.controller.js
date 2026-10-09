const data = require('../services/data.service');
const geography = require('../services/geography.service');
function optionalCoords(query) {
  return query.lat && query.lng
    ? { lat: Number(query.lat), lng: Number(query.lng), radiusKm: Number(query.radius_km) || 60 }
    : {};
}
async function listTraps(req, res) {
  res.json(
    await data.trapList({
      city: req.query.city || undefined,
      type: req.query.type || undefined,
      service: req.query.service || undefined,
      ...optionalCoords(req.query),
    }),
  );
}
async function mapData(req, res) {
  res.json(
    await data.trapList({
      city: req.query.city || undefined,
      service: req.query.service || undefined,
      ...optionalCoords(req.query),
    }),
  );
}
async function geocode(req, res) {
  if (!req.query.q) return res.status(400).json({ error: 'Search query is required.' });
  try {
    res.json(await geography.geocode(req.query.q));
  } catch {
    res.json([]);
  }
}
module.exports = { listTraps, mapData, geocode };
