'use strict';

const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 10;

function createSeedUsers() {
  return [
    {
      id: '240104040185',
      username: 'mhs1',
      nama: 'Ahmad Padla Kamal',
      email: '240104040185@uin-antasari.ac.id',
      kelas: 'TI24B',
      role: 'mahasiswa',
      passwordHash: bcrypt.hashSync('mhs12345', BCRYPT_ROUNDS)
    },
    {
      id: '240104040199',
      username: 'mhs2',
      nama: 'Rizky Pratama',
      email: '240104040199@uin-antasari.ac.id',
      kelas: 'TI24B',
      role: 'mahasiswa',
      passwordHash: bcrypt.hashSync('mhs12345', BCRYPT_ROUNDS)
    },
    {
      id: 'ADM001',
      username: 'admin',
      nama: 'Administrator SIMADU',
      email: 'admin@uin-antasari.ac.id',
      kelas: null,
      role: 'admin',
      passwordHash: bcrypt.hashSync('admin12345', BCRYPT_ROUNDS)
    }
  ];
}

let users = createSeedUsers();

function findByUsername(username) {
  if (typeof username !== 'string') return null;
  const normalized = username.trim().toLowerCase();
  const user = users.find((item) => item.username.toLowerCase() === normalized);
  return user ? { ...user } : null;
}

function findById(id) {
  const user = users.find((item) => item.id === id);
  return user ? { ...user } : null;
}

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    nama: user.nama,
    email: user.email,
    role: user.role
  };
}

function reset() {
  users = createSeedUsers();
}

module.exports = {
  findByUsername,
  findById,
  sanitizeUser,
  reset
};
