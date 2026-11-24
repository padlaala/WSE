'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env.cjs');
const userRepository = require('../repositories/user.repository.cjs');
const AppError = require('../utils/appError.cjs');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || typeof authHeader !== 'string') {
    return next(
      new AppError(
        401,
        'Header Authorization dengan Bearer Token wajib disertakan',
        'AUTH_TOKEN_MISSING'
      )
    );
  }

  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
    return next(
      new AppError(
        401,
        'Format Authorization tidak valid. Gunakan format: Bearer <token>',
        'AUTH_SCHEME_INVALID'
      )
    );
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      issuer: 'simadu-api'
    });

    const user = userRepository.findById(decoded.sub);
    if (!user) {
      return next(
        new AppError(
          401,
          'Pengguna pemilik token tidak ditemukan atau sudah tidak aktif',
          'AUTH_USER_NOT_FOUND'
        )
      );
    }

    req.user = {
      id: user.id,
      username: user.username,
      nama: user.nama,
      role: user.role
    };

    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(
        new AppError(
          401,
          'Token autentikasi telah kedaluwarsa. Silakan login kembali',
          'AUTH_TOKEN_EXPIRED'
        )
      );
    }

    return next(
      new AppError(
        401,
        'Token autentikasi tidak valid',
        'AUTH_TOKEN_INVALID'
      )
    );
  }
}

module.exports = {
  authenticate
};
