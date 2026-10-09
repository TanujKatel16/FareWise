const { randomUUID } = require('node:crypto');
const seed = require('../data/seed.json');
const data = require('../services/data.service');
const { attachEvidence } = require('../services/upload.service');

async function createReport(req, res) {
  const input = req.body;
  if (!input.city || !input.service_type || !Number(input.price_paid)) {
    return res.status(400).json({ error: 'City, service and a valid price are required.' });
  }
  const city = seed.cities.find((item) => item.name === input.city);
  if (!city) return res.status(400).json({ error: 'Choose a supported Northeast city.' });
  const report = {
    ...input,
    id: randomUUID(),
    state: city.state,
    currency: city.currency,
    distance_km: Number(input.distance_km) || 5,
    created_at: new Date().toISOString(),
    verified: false,
  };
  await attachEvidence(report);
  await data.createReport(report);
  res.status(201).json({ ok: true, report });
}
module.exports = { createReport };
