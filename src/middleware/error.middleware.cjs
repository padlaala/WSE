'use strict';

const AppError = require('../utils/appError.cjs');
const { sendError } = require('../utils/response.cjs');

function notFoundHandler(req, res) {
  return sendError(
    res,
    404,
    `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan`,
    'ROUTE_NOT_FOUND'
  );
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  // Kesalahan parsing JSON (body tidak valid)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(
      res,
      400,
      'Format JSON pada body request tidak valid',
      'MALFORMED_JSON'
    );
  }

  // Payload terlalu besar
  if (err && err.type === 'entity.too.large') {
    return sendError(
      res,
      400,
      'Ukuran payload melebihi batas yang diperbolehkan',
      'PAYLOAD_TOO_LARGE'
    );
  }

  // Kesalahan operasional terkelola (400, 401, 403, 404)
  if (err instanceof AppError) {
    return sendError(res, err.statusCode, err.message, err.code, err.details);
  }

  // Kesalahan internal tak terduga (500) tanpa membocorkan stack trace / info sensitif ke client
  if (process.env.NODE_ENV !== 'test') {
    console.error('[INTERNAL_ERROR]', err && err.message ? err.message : err);
  }

  return sendError(
    res,
    500,
    'Terjadi kesalahan internal pada server',
    'INTERNAL_SERVER_ERROR'
  );
}

module.exports = {
  notFoundHandler,
  errorHandler
};
