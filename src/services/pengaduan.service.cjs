'use strict';

const pengaduanRepository = require('../repositories/pengaduan.repository.cjs');
const AppError = require('../utils/appError.cjs');

function listPengaduan(currentUser, queryFilters = {}) {
  const filters = {
    kategori: queryFilters.kategori,
    status: queryFilters.status
  };

  if (currentUser.role === 'mahasiswa') {
    filters.mahasiswaId = currentUser.id;
  }

  return pengaduanRepository.findAll(filters);
}

function getPengaduanById(id, currentUser) {
  const pengaduan = pengaduanRepository.findById(id);
  if (!pengaduan) {
    throw new AppError(
      404,
      `Pengaduan dengan ID ${id} tidak ditemukan`,
      'PENGADUAN_NOT_FOUND'
    );
  }

  if (
    currentUser.role === 'mahasiswa' &&
    pengaduan.mahasiswaId !== currentUser.id
  ) {
    throw new AppError(
      403,
      'Anda tidak memiliki izin untuk melihat pengaduan milik mahasiswa lain',
      'FORBIDDEN_RESOURCE_ACCESS'
    );
  }

  return pengaduan;
}

function createPengaduan(data, currentUser) {
  if (currentUser.role !== 'mahasiswa') {
    throw new AppError(
      403,
      'Hanya mahasiswa yang diperbolehkan membuat pengaduan',
      'FORBIDDEN_ROLE'
    );
  }

  return pengaduanRepository.create({
    mahasiswaId: currentUser.id,
    judul: data.judul,
    kategori: data.kategori,
    deskripsi: data.deskripsi
  });
}

function updatePengaduan(id, data, currentUser) {
  if (currentUser.role !== 'mahasiswa') {
    throw new AppError(
      403,
      'Hanya mahasiswa pemilik yang diperbolehkan mengubah isi pengaduan',
      'FORBIDDEN_ROLE'
    );
  }

  const existing = pengaduanRepository.findById(id);
  if (!existing) {
    throw new AppError(
      404,
      `Pengaduan dengan ID ${id} tidak ditemukan`,
      'PENGADUAN_NOT_FOUND'
    );
  }

  if (existing.mahasiswaId !== currentUser.id) {
    throw new AppError(
      403,
      'Anda tidak memiliki izin untuk mengubah pengaduan milik mahasiswa lain',
      'FORBIDDEN_OWNERSHIP'
    );
  }

  if (existing.status !== 'diajukan') {
    throw new AppError(
      403,
      `Pengaduan dengan status "${existing.status}" tidak dapat diubah. Pengaduan hanya boleh diubah selama berstatus "diajukan"`,
      'PENGADUAN_STATUS_LOCKED'
    );
  }

  return pengaduanRepository.updateContent(id, {
    judul: data.judul,
    kategori: data.kategori,
    deskripsi: data.deskripsi
  });
}

function updatePengaduanStatus(id, status, currentUser) {
  if (currentUser.role !== 'admin') {
    throw new AppError(
      403,
      'Hanya administrator yang diperbolehkan memperbarui status pengaduan',
      'FORBIDDEN_ROLE'
    );
  }

  const existing = pengaduanRepository.findById(id);
  if (!existing) {
    throw new AppError(
      404,
      `Pengaduan dengan ID ${id} tidak ditemukan`,
      'PENGADUAN_NOT_FOUND'
    );
  }

  return pengaduanRepository.updateStatus(id, status);
}

function deletePengaduan(id, currentUser) {
  if (currentUser.role !== 'mahasiswa') {
    throw new AppError(
      403,
      'Hanya mahasiswa pemilik yang diperbolehkan menghapus pengaduan',
      'FORBIDDEN_ROLE'
    );
  }

  const existing = pengaduanRepository.findById(id);
  if (!existing) {
    throw new AppError(
      404,
      `Pengaduan dengan ID ${id} tidak ditemukan`,
      'PENGADUAN_NOT_FOUND'
    );
  }

  if (existing.mahasiswaId !== currentUser.id) {
    throw new AppError(
      403,
      'Anda tidak memiliki izin untuk menghapus pengaduan milik mahasiswa lain',
      'FORBIDDEN_OWNERSHIP'
    );
  }

  if (existing.status !== 'diajukan') {
    throw new AppError(
      403,
      `Pengaduan dengan status "${existing.status}" tidak dapat dihapus. Pengaduan hanya boleh dihapus selama berstatus "diajukan"`,
      'PENGADUAN_STATUS_LOCKED'
    );
  }

  const deleted = pengaduanRepository.remove(id);
  return { id: deleted.id };
}

module.exports = {
  listPengaduan,
  getPengaduanById,
  createPengaduan,
  updatePengaduan,
  updatePengaduanStatus,
  deletePengaduan
};
