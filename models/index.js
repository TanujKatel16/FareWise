const definitions = {
  service_types: require('./service-type.model'),
  price_reports: require('./price-report.model'),
  trap_entries: require('./trap-entry.model'),
  complaints: require('./complaint.model'),
  check_logs: require('./check-log.model'),
};
async function ensureIndexes(database) {
  for (const [collection, indexes] of Object.entries(definitions)) {
    const model = database.collection(collection);
    for (const [keys, options] of indexes) {
      await model.createIndex(keys, options);
    }
  }
}
module.exports = { definitions, ensureIndexes };
