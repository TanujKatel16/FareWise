const data = require('../services/data.service');
async function config(req, res) {
  res.json(await data.cityConfig());
}
module.exports = { config };
