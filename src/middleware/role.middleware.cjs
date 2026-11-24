'use strict';

const AppError = require('../utils/appError.cjs');

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new AppError(401, 'Pengguna belum terautentikasi', 'UNAUTHENTICATED')
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          403,
          `Akses ditolak. Operasi ini hanya diizinkan untuk role: ${allowedRoles.join(', ')}`,
          'FORBIDDEN_ROLE'
        )
      );
    }

    return next();
  };
}

module.exports = {
  authorizeRoles
};
