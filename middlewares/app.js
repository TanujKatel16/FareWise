const express = require('express');
const { root } = require('../config/env');
const apiRouter = require('../routes/api.routes');
const securityHeaders = require('./security.middleware');
const { notFound, errorHandler } = require('./error.middleware');

function buildApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(securityHeaders);
  app.use(express.json({ limit: '8mb' }));
  app.use('/api', apiRouter);
  app.use(
    express.static(root + '/public', {
      extensions: ['html'],
      maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
    }),
  );
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
module.exports = buildApp;
