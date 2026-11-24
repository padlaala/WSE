'use strict';

const AppError = require('../utils/appError.cjs');

const ALLOWED_KATEGORI = ['Fasilitas', 'Akademik', 'TI'];
const ALLOWED_STATUS = ['diajukan', 'diproses', 'selesai'];
const ALLOWED_PENGADUAN_FIELDS = ['judul', 'kategori', 'deskripsi'];
const FORBIDDEN_PENGADUAN_FIELDS = ['id', 'mahasiswaId', 'status', 'createdAt'];

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

function validateIdParam(req, res, next) {
  const rawId = req.params.id;
  if (typeof rawId !== 'string' || !/^[1-9]\d*$/.test(rawId)) {
    return next(
      new AppError(
        400,
        'Parameter ID pengaduan harus berupa bilangan bulat positif',
        'INVALID_ID_PARAM'
      )
    );
  }

  req.validatedId = Number.parseInt(rawId, 10);
  return next();
}

function validateLoginPayload(req, res, next) {
  if (!isPlainObject(req.body)) {
    return next(
      new AppError(
        400,
        'Body request harus berupa objek JSON yang valid',
        'INVALID_PAYLOAD'
      )
    );
  }

  const errors = [];
  const allowedKeys = ['username', 'password'];
  for (const key of Object.keys(req.body)) {
    if (!allowedKeys.includes(key)) {
      errors.push({
        field: key,
        message: `Field "${key}" tidak diperbolehkan pada request login`
      });
    }
  }

  const { username, password } = req.body;
  if (typeof username !== 'string' || username.trim().length === 0) {
    errors.push({
      field: 'username',
      message: 'Field username wajib diisi berupa string'
    });
  }

  if (typeof password !== 'string' || password.length === 0) {
    errors.push({
      field: 'password',
      message: 'Field password wajib diisi berupa string'
    });
  }

  if (errors.length > 0) {
    return next(
      new AppError(400, 'Validasi login gagal', 'VALIDATION_ERROR', errors)
    );
  }

  req.validatedBody = {
    username: username.trim(),
    password
  };

  return next();
}

function validatePengaduanQuery(req, res, next) {
  const errors = [];
  const validatedQuery = {};

  if (req.query.kategori !== undefined) {
    if (
      typeof req.query.kategori !== 'string' ||
      !ALLOWED_KATEGORI.includes(req.query.kategori)
    ) {
      errors.push({
        field: 'kategori',
        message: `Filter kategori harus salah satu dari: ${ALLOWED_KATEGORI.join(', ')}`
      });
    } else {
      validatedQuery.kategori = req.query.kategori;
    }
  }

  if (req.query.status !== undefined) {
    if (
      typeof req.query.status !== 'string' ||
      !ALLOWED_STATUS.includes(req.query.status)
    ) {
      errors.push({
        field: 'status',
        message: `Filter status harus salah satu dari: ${ALLOWED_STATUS.join(', ')}`
      });
    } else {
      validatedQuery.status = req.query.status;
    }
  }

  if (errors.length > 0) {
    return next(
      new AppError(400, 'Parameter query tidak valid', 'VALIDATION_ERROR', errors)
    );
  }

  req.validatedQuery = validatedQuery;
  return next();
}

function validatePengaduanPayload(req, res, next) {
  if (!isPlainObject(req.body)) {
    return next(
      new AppError(
        400,
        'Body request harus berupa objek JSON yang valid',
        'INVALID_PAYLOAD'
      )
    );
  }

  const errors = [];

  for (const key of Object.keys(req.body)) {
    if (FORBIDDEN_PENGADUAN_FIELDS.includes(key)) {
      errors.push({
        field: key,
        message: `Field "${key}" dikelola oleh server dan tidak diperbolehkan dikirim oleh client`
      });
    } else if (!ALLOWED_PENGADUAN_FIELDS.includes(key)) {
      errors.push({
        field: key,
        message: `Field "${key}" tidak diperbolehkan`
      });
    }
  }

  const { judul, kategori, deskripsi } = req.body;

  if (typeof judul !== 'string' || judul.trim().length === 0) {
    errors.push({
      field: 'judul',
      message: 'Field judul wajib diisi berupa teks'
    });
  } else {
    const trimmedJudul = judul.trim();
    if (trimmedJudul.length < 5 || trimmedJudul.length > 120) {
      errors.push({
        field: 'judul',
        message: 'Panjang judul harus antara 5 hingga 120 karakter'
      });
    }
  }

  if (typeof kategori !== 'string' || !ALLOWED_KATEGORI.includes(kategori)) {
    errors.push({
      field: 'kategori',
      message: `Field kategori wajib dipilih dari: ${ALLOWED_KATEGORI.join(', ')}`
    });
  }

  if (typeof deskripsi !== 'string' || deskripsi.trim().length === 0) {
    errors.push({
      field: 'deskripsi',
      message: 'Field deskripsi wajib diisi berupa teks'
    });
  } else {
    const trimmedDeskripsi = deskripsi.trim();
    if (trimmedDeskripsi.length < 10 || trimmedDeskripsi.length > 1000) {
      errors.push({
        field: 'deskripsi',
        message: 'Panjang deskripsi harus antara 10 hingga 1000 karakter'
      });
    }
  }

  if (errors.length > 0) {
    return next(
      new AppError(400, 'Validasi data pengaduan gagal', 'VALIDATION_ERROR', errors)
    );
  }

  req.validatedBody = {
    judul: judul.trim(),
    kategori,
    deskripsi: deskripsi.trim()
  };

  return next();
}

function validateStatusPayload(req, res, next) {
  if (!isPlainObject(req.body)) {
    return next(
      new AppError(
        400,
        'Body request harus berupa objek JSON yang valid',
        'INVALID_PAYLOAD'
      )
    );
  }

  const errors = [];

  for (const key of Object.keys(req.body)) {
    if (key !== 'status') {
      errors.push({
        field: key,
        message: `Field "${key}" tidak diperbolehkan pada pembaruan status; hanya field "status" yang diizinkan`
      });
    }
  }

  const { status } = req.body;
  if (typeof status !== 'string' || !ALLOWED_STATUS.includes(status)) {
    errors.push({
      field: 'status',
      message: `Field status wajib bernilai salah satu dari: ${ALLOWED_STATUS.join(', ')}`
    });
  }

  if (errors.length > 0) {
    return next(
      new AppError(400, 'Validasi status pengaduan gagal', 'VALIDATION_ERROR', errors)
    );
  }

  req.validatedBody = { status };
  return next();
}

module.exports = {
  ALLOWED_KATEGORI,
  ALLOWED_STATUS,
  FORBIDDEN_PENGADUAN_FIELDS,
  validateIdParam,
  validateLoginPayload,
  validatePengaduanQuery,
  validatePengaduanPayload,
  validateStatusPayload
};
