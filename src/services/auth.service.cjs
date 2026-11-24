'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env.cjs');
const userRepository = require('../repositories/user.repository.cjs');
const AppError = require('../utils/appError.cjs');

async function login({ username, password }) {
  const user = userRepository.findByUsername(username);
  if (!user) {
    throw new AppError(
      401,
      'Username atau password tidak valid',
      'INVALID_CREDENTIALS'
    );
  }

  const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordMatch) {
    throw new AppError(
      401,
      'Username atau password tidak valid',
      'INVALID_CREDENTIALS'
    );
  }

  const payload = {
    sub: user.id,
    username: user.username,
    role: user.role,
    nama: user.nama,
    jti: crypto.randomUUID()
  };

  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    issuer: 'simadu-api'
  });

  return {
    tokenType: 'Bearer',
    accessToken,
    expiresIn: env.JWT_EXPIRES_IN,
    user: userRepository.sanitizeUser(user)
  };
}

module.exports = {
  login
};
