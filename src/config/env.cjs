'use strict';

require('dotenv').config();

const env = {
  PORT: Number(process.env.PORT) || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET:
    process.env.JWT_SECRET ||
    'simadu-dev-secret-240104040185-uin-antasari-jangan-pakai-di-produksi',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*'
};

module.exports = env;
