const http = require('node:http'),
  config = require('./config/env');
config.loadEnv();
const database = require('./config/database'),
  buildApp = require('./middlewares/app');
async function start() {
  await database.connect();
  const app = buildApp(),
    server = http.createServer(app);
  server.listen(config.port(), () =>
    console.log('Farewise listening at http://localhost:' + config.port()),
  );
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, () => server.close(async () => process.exit(0)));
}
start().catch((error) => {
  console.error('Unable to start Farewise:', error);
  process.exit(1);
});
