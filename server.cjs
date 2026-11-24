'use strict';

const app = require('./app.cjs');
const env = require('./src/config/env.cjs');

const server = app.listen(env.PORT, () => {
  console.log(`SIMADU API berjalan di http://localhost:${env.PORT}`);
  console.log(`Swagger UI tersedia di http://localhost:${env.PORT}/api-docs`);
});

process.on('SIGINT', () => {
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});

module.exports = server;
