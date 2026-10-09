const { randomUUID } = require('node:crypto');
const data = require('../services/data.service');
const { attachEvidence } = require('../services/upload.service');
async function createComplaint(req, res) {
  const input = req.body;
  if (!input.city || !input.text)
    return res.status(400).json({ error: 'City and report details are required.' });
  const complaint = { ...input, id: randomUUID(), created_at: new Date().toISOString() };
  await attachEvidence(complaint);
  await data.createComplaint(complaint);
  res.status(201).json({ ok: true, complaint });
}
module.exports = { createComplaint };
