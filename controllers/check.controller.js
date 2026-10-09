const { randomUUID } = require('node:crypto');
const seed = require('../data/seed.json');
const data = require('../services/data.service');
const geography = require('../services/geography.service');
const pricing = require('../services/pricing.service');
const explanation = require('../services/explanation.service');
const database = require('../config/database');

async function check(req, res) {
  const result = await pricing.calculate(req.body, { data, geography, seed });
  result.explanation = await explanation.explain(result);
  const safeInput = { ...req.body };
  delete safeInput.lat;
  delete safeInput.lng;
  delete safeInput.origin_coords;
  await database.saveCheck({
    id: randomUUID(),
    input: safeInput,
    result,
    created_at: new Date().toISOString(),
  });
  res.json(result);
}
module.exports = { check };
