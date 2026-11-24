'use strict';

const authService = require('../services/auth.service.cjs');
const { sendSuccess } = require('../utils/response.cjs');

async function login(req, res) {
  const result = await authService.login(req.validatedBody);
  return sendSuccess(res, 200, 'Login berhasil', result);
}

module.exports = {
  login
};
