require('../config/env').loadEnv();
const { MongoClient } = require('mongodb');
const seed = require('../data/seed.json'),
  { mongoUri, dbName } = require('../config/env');
async function seedDatabase() {
  if (!mongoUri()) throw new Error('Set MONGODB_URI before seeding MongoDB.');
  const client = new MongoClient(mongoUri());
  try {
    await client.connect();
    const db = client.db(dbName());
    const batches = [
      ['service_types', seed.services],
      ['price_reports', seed.reports],
      ['trap_entries', seed.traps],
    ];
    for (const [name, items] of batches) {
      const col = db.collection(name);
      await col.createIndex({ id: 1 }, { unique: true });
      if (items.length)
        await col.bulkWrite(
          items.map((item) => ({
            updateOne: {
              filter: { id: item.id },
              update: { $set: { ...item, _id: item.id } },
              upsert: true,
            },
          })),
        );
      console.log(name + ': ' + items.length + ' seed records ready');
    }
    await db.collection('price_reports').createIndex({ city: 1, service_type: 1, created_at: -1 });
    await db.collection('trap_entries').createIndex({ city: 1, category: 1 });
  } finally {
    await client.close();
  }
}
seedDatabase().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
