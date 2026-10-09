const fs = require('node:fs'),
  path = require('node:path'),
  config = require('./env'),
  models = require('../models');
const localFile = path.join(config.root, 'data', 'user-data.json');
let client = null,
  db = null;
function localData() {
  try {
    return JSON.parse(fs.readFileSync(localFile, 'utf8'));
  } catch {
    return { reports: [], traps: [], complaints: [], checks: [] };
  }
}
function saveLocal(data) {
  const tmp = localFile + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, localFile);
}
async function connect() {
  const uri = config.mongoUri();
  if (!uri) {
    console.log(
      'MongoDB not configured; using local JSON storage. Set MONGODB_URI to enable MongoDB.',
    );
    return false;
  }
  try {
    const { MongoClient } = require('mongodb');
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 3500 });
    await client.connect();
    db = client.db(config.dbName());
    await models.ensureIndexes(db);
    console.log('Connected to MongoDB database "' + config.dbName() + '".');
    return true;
  } catch (error) {
    console.warn('MongoDB unavailable (' + error.message + '); using local JSON storage.');
    db = null;
    return false;
  }
}
const isMongo = () => !!db;
async function many(collection, query = {}) {
  if (db)
    return db
      .collection(collection)
      .find(query, { projection: { _id: 0 } })
      .toArray();
  const d = localData(),
    key = {
      price_reports: 'reports',
      trap_entries: 'traps',
      complaints: 'complaints',
      check_logs: 'checks',
    }[collection];
  return d[key] || [];
}
async function insert(collection, record) {
  if (db) {
    await db.collection(collection).insertOne({ ...record, _id: record.id });
    return record;
  }
  const d = localData(),
    key = {
      price_reports: 'reports',
      trap_entries: 'traps',
      complaints: 'complaints',
      check_logs: 'checks',
    }[collection];
  d[key] ??= [];
  d[key].push(record);
  saveLocal(d);
  return record;
}
async function saveCheck(record) {
  if (db) {
    await db.collection('check_logs').insertOne({ ...record, _id: record.id });
    return;
  }
  const d = localData();
  d.checks.unshift(record);
  d.checks = d.checks.slice(0, 100);
  saveLocal(d);
}
module.exports = { connect, isMongo, many, insert, saveCheck };
