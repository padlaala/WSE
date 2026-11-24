'use strict';

const pengaduanService = require('../services/pengaduan.service.cjs');
const { sendSuccess } = require('../utils/response.cjs');

async function list(req, res) {
  const items = pengaduanService.listPengaduan(req.user, req.validatedQuery || {});
  return sendSuccess(res, 200, 'Daftar pengaduan berhasil diambil', items, {
    total: items.length
  });
}

async function getById(req, res) {
  const item = pengaduanService.getPengaduanById(req.validatedId, req.user);
  return sendSuccess(res, 200, 'Detail pengaduan berhasil diambil', item);
}

async function create(req, res) {
  const created = pengaduanService.createPengaduan(req.validatedBody, req.user);
  return sendSuccess(res, 201, 'Pengaduan berhasil dibuat', created);
}

async function update(req, res) {
  const updated = pengaduanService.updatePengaduan(
    req.validatedId,
    req.validatedBody,
    req.user
  );
  return sendSuccess(res, 200, 'Pengaduan berhasil diperbarui', updated);
}

async function updateStatus(req, res) {
  const updated = pengaduanService.updatePengaduanStatus(
    req.validatedId,
    req.validatedBody.status,
    req.user
  );
  return sendSuccess(res, 200, 'Status pengaduan berhasil diperbarui', updated);
}

async function remove(req, res) {
  const deleted = pengaduanService.deletePengaduan(req.validatedId, req.user);
  return sendSuccess(res, 200, 'Pengaduan berhasil dihapus', deleted);
}

module.exports = {
  list,
  getById,
  create,
  update,
  updateStatus,
  remove
};
