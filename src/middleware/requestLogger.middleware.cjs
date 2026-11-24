'use strict';

/**
 * Logger permintaan HTTP yang aman:
 * hanya mencatat metode, jalur, kode status, dan durasi.
 * Secara sengaja TIDAK mencatat header Authorization, Bearer token, ataupun password.
 */
function requestLogger(req, res, next) {
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  const startedAt = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const timestamp = new Date().toISOString();
    console.log(
      `[${timestamp}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs}ms)`
    );
  });

  return next();
}

module.exports = {
  requestLogger
};
