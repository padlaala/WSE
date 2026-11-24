'use strict';

function createSeedPengaduan() {
  return [
    {
      id: 1,
      mahasiswaId: '240104040185',
      judul: 'Lampu Ruang Kuliah TI-203 Padam',
      kategori: 'Fasilitas',
      deskripsi:
        'Dua lampu neon di bagian depan Ruang Kuliah TI-203 padam sejak pagi hari sehingga pencahayaan kelas kurang memadai.',
      status: 'diajukan',
      createdAt: '2026-11-18T08:30:00.000Z'
    },
    {
      id: 2,
      mahasiswaId: '240104040185',
      judul: 'Nilai Mata Kuliah Belum Muncul di SIAKAD',
      kategori: 'Akademik',
      deskripsi:
        'Nilai mata kuliah semester sebelumnya belum tampil pada kartu hasil studi di portal SIAKAD mahasiswa.',
      status: 'diproses',
      createdAt: '2026-11-18T10:15:00.000Z'
    },
    {
      id: 3,
      mahasiswaId: '240104040199',
      judul: 'Koneksi WiFi Gedung Fakultas Sering Terputus',
      kategori: 'TI',
      deskripsi:
        'Jaringan WiFi kampus di lantai dua gedung perkuliahan sering terputus setiap sepuluh menit saat jam sibuk.',
      status: 'diajukan',
      createdAt: '2026-11-19T07:45:00.000Z'
    }
  ];
}

let pengaduanStore = createSeedPengaduan();
let nextId = 4;

function findAll(filters = {}) {
  return pengaduanStore
    .filter((item) => {
      if (filters.mahasiswaId && item.mahasiswaId !== filters.mahasiswaId) {
        return false;
      }
      if (filters.kategori && item.kategori !== filters.kategori) {
        return false;
      }
      if (filters.status && item.status !== filters.status) {
        return false;
      }
      return true;
    })
    .map((item) => ({ ...item }));
}

function findById(id) {
  const found = pengaduanStore.find((item) => item.id === id);
  return found ? { ...found } : null;
}

function create({ mahasiswaId, judul, kategori, deskripsi }) {
  const record = {
    id: nextId++,
    mahasiswaId,
    judul,
    kategori,
    deskripsi,
    status: 'diajukan',
    createdAt: new Date().toISOString()
  };
  pengaduanStore.push(record);
  return { ...record };
}

function updateContent(id, { judul, kategori, deskripsi }) {
  const index = pengaduanStore.findIndex((item) => item.id === id);
  if (index === -1) return null;

  const existing = pengaduanStore[index];
  const updated = {
    ...existing,
    judul,
    kategori,
    deskripsi
  };
  pengaduanStore[index] = updated;
  return { ...updated };
}

function updateStatus(id, status) {
  const index = pengaduanStore.findIndex((item) => item.id === id);
  if (index === -1) return null;

  const existing = pengaduanStore[index];
  const updated = {
    ...existing,
    status
  };
  pengaduanStore[index] = updated;
  return { ...updated };
}

function remove(id) {
  const index = pengaduanStore.findIndex((item) => item.id === id);
  if (index === -1) return null;

  const [deleted] = pengaduanStore.splice(index, 1);
  return { ...deleted };
}

function reset() {
  pengaduanStore = createSeedPengaduan();
  nextId = 4;
}

module.exports = {
  findAll,
  findById,
  create,
  updateContent,
  updateStatus,
  remove,
  reset
};
