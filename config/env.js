const fs = require('node:fs'),
  path = require('node:path');
const root = path.resolve(__dirname, '..');
function loadEnv() {
  const file = path.join(root, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
module.exports = {
  root,
  loadEnv,
  port: () => Number(process.env.PORT || 3000),
  mongoUri: () => process.env.MONGODB_URI || '',
  dbName: () => process.env.MONGODB_DB || 'farewise',
  googleMapsApiKey: () => process.env.GOOGLE_MAPS_API_KEY || '',
};
