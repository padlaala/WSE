'use strict';

const express = require('express');
const authController = require('../controllers/auth.controller.cjs');
const { validateLoginPayload } = require('../middleware/validate.middleware.cjs');

const router = express.Router();

router.post('/login', validateLoginPayload, authController.login);

module.exports = router;
