const fs = require('node:fs');
const path = require('node:path');
const { root } = require('../config/env');

async function attachEvidence(record) {
  if (!record.photo_data) return record;
  const match = String(record.photo_data).match(
    /^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/=]+)$/,
  );
  if (!match)
    throw Object.assign(new Error('Photo must be a PNG, JPG, WEBP, or GIF image.'), {
      status: 400,
    });
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > 5 * 1024 * 1024)
    throw Object.assign(new Error('Photos must be 5 MB or smaller.'), { status: 400 });
  const directory = path.join(root, 'data', 'uploads');
  fs.mkdirSync(directory, { recursive: true });
  const extension = match[1] === 'jpeg' ? 'jpg' : match[1];
  const filename = record.id + '.' + extension;
  fs.writeFileSync(path.join(directory, filename), bytes);
  record.evidence_url = '/uploads/' + filename;
  record.photo_url = record.evidence_url;
  record.photo_name = String(record.photo_name || 'receipt image').slice(0, 150);
  delete record.photo_data;
  return record;
}
module.exports = { attachEvidence };
