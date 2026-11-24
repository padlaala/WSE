'use strict';

const express = require('express');
const pengaduanController = require('../controllers/pengaduan.controller.cjs');
const { authenticate } = require('../middleware/auth.middleware.cjs');
const { authorizeRoles } = require('../middleware/role.middleware.cjs');
const {
  validateIdParam,
  validatePengaduanQuery,
  validatePengaduanPayload,
  validateStatusPayload
} = require('../middleware/validate.middleware.cjs');

const router = express.Router();

// Semua endpoint /api/pengaduan wajib terautentikasi Bearer Token
router.use(authenticate);

// GET /api/pengaduan — Mahasiswa melihat milik sendiri, Admin melihat semua
router.get(
  '/',
  authorizeRoles('mahasiswa', 'admin'),
  validatePengaduanQuery,
  pengaduanController.list
);

// GET /api/pengaduan/:id — Mahasiswa hanya milik sendiri, Admin boleh semua
router.get(
  '/:id',
  authorizeRoles('mahasiswa', 'admin'),
  validateIdParam,
  pengaduanController.getById
);

// POST /api/pengaduan — Khusus Mahasiswa
router.post(
  '/',
  authorizeRoles('mahasiswa'),
  validatePengaduanPayload,
  pengaduanController.create
);

// PUT /api/pengaduan/:id — Khusus Mahasiswa pemilik (dan status masih "diajukan")
router.put(
  '/:id',
  authorizeRoles('mahasiswa'),
  validateIdParam,
  validatePengaduanPayload,
  pengaduanController.update
);

// PATCH /api/pengaduan/:id/status — Khusus Admin
router.patch(
  '/:id/status',
  authorizeRoles('admin'),
  validateIdParam,
  validateStatusPayload,
  pengaduanController.updateStatus
);

// DELETE /api/pengaduan/:id — Khusus Mahasiswa pemilik (dan status masih "diajukan")
router.delete(
  '/:id',
  authorizeRoles('mahasiswa'),
  validateIdParam,
  pengaduanController.remove
);

module.exports = router;
