'use strict';

process.env.NODE_ENV = 'test';

const assert = require('assert');
const jwt = require('jsonwebtoken');
const app = require('../app.cjs');
const env = require('../src/config/env.cjs');
const pengaduanRepository = require('../src/repositories/pengaduan.repository.cjs');

let server;
let baseUrl;
const results = [];

async function httpRequest(method, path, { token, body, rawBody, headers = {} } = {}) {
  const reqHeaders = { ...headers };
  if (token) {
    reqHeaders.Authorization = `Bearer ${token}`;
  }
  if (body !== undefined && rawBody === undefined) {
    reqHeaders['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: reqHeaders,
    body: rawBody !== undefined ? rawBody : body !== undefined ? JSON.stringify(body) : undefined
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await res.json()
    : await res.text();

  return { status: res.status, data };
}

async function runCase(code, title, fn) {
  try {
    const detail = await fn();
    results.push({ code, title, passed: true, detail });
    console.log(`[PASS] ${code} - ${title}`);
    if (detail) {
      console.log(`       Status: ${detail.status} | Response: ${JSON.stringify(detail.sample)}`);
    }
  } catch (err) {
    results.push({ code, title, passed: false, error: err.message });
    console.error(`[FAIL] ${code} - ${title}`);
    console.error(`       Error: ${err.message}`);
  }
}

async function main() {
  pengaduanRepository.reset();

  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });

  console.log('====================================================================');
  console.log('SIMADU API — Automated Functional & Security Test Suite');
  console.log(`Server uji sementara: ${baseUrl}`);
  console.log('====================================================================\n');

  let mhs1Token = '';
  let mhs2Token = '';
  let adminToken = '';
  let createdPengaduanId = null;

  // ------------------------------------------------------------------
  // 12 SKENARIO WAJIB UTS WEB SERVICE ENGINEERING
  // ------------------------------------------------------------------

  await runCase('T01', 'Login dengan kredensial benar (Mahasiswa 1)', async () => {
    const res = await httpRequest('POST', '/api/auth/login', {
      body: { username: 'mhs1', password: 'mhs12345' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.tokenType, 'Bearer');
    assert.ok(typeof res.data.data.accessToken === 'string' && res.data.data.accessToken.length > 20);
    assert.strictEqual(res.data.data.user.id, '240104040185');
    assert.strictEqual(res.data.data.user.role, 'mahasiswa');
    assert.strictEqual(res.data.data.user.passwordHash, undefined);
    mhs1Token = res.data.data.accessToken;

    // Login mhs2 & admin untuk skenario berikutnya sekaligus pastikan token berbeda tiap user
    const resMhs2 = await httpRequest('POST', '/api/auth/login', {
      body: { username: 'mhs2', password: 'mhs12345' }
    });
    assert.strictEqual(resMhs2.status, 200);
    mhs2Token = resMhs2.data.data.accessToken;
    assert.notStrictEqual(mhs1Token, mhs2Token);

    const resAdmin = await httpRequest('POST', '/api/auth/login', {
      body: { username: 'admin', password: 'admin12345' }
    });
    assert.strictEqual(resAdmin.status, 200);
    adminToken = resAdmin.data.data.accessToken;
    assert.notStrictEqual(mhs1Token, adminToken);

    return {
      status: res.status,
      sample: {
        success: res.data.success,
        message: res.data.message,
        tokenType: res.data.data.tokenType,
        expiresIn: res.data.data.expiresIn,
        user: res.data.data.user
      }
    };
  });

  await runCase('T02', 'Login dengan password salah', async () => {
    const res = await httpRequest('POST', '/api/auth/login', {
      body: { username: 'mhs1', password: 'password-salah' }
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.data.success, false);
    assert.strictEqual(res.data.error.code, 'INVALID_CREDENTIALS');
    return { status: res.status, sample: res.data };
  });

  await runCase('T03', 'Akses endpoint terlindungi tanpa token', async () => {
    const res = await httpRequest('GET', '/api/pengaduan');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.data.success, false);
    assert.strictEqual(res.data.error.code, 'AUTH_TOKEN_MISSING');
    return { status: res.status, sample: res.data };
  });

  await runCase('T04', 'Akses menggunakan token tidak valid', async () => {
    const res = await httpRequest('GET', '/api/pengaduan', {
      token: 'token.palsu.tidakvalid'
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.data.success, false);
    assert.strictEqual(res.data.error.code, 'AUTH_TOKEN_INVALID');
    return { status: res.status, sample: res.data };
  });

  await runCase('T05', 'Mahasiswa membuat pengaduan valid', async () => {
    const res = await httpRequest('POST', '/api/pengaduan', {
      token: mhs1Token,
      body: {
        judul: 'Proyektor Lab Komputer 2 Tidak Menyala',
        kategori: 'Fasilitas',
        deskripsi:
          'Proyektor pada Laboratorium Komputer 2 tidak dapat menyala meskipun kabel daya sudah terpasang.'
      }
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.mahasiswaId, '240104040185');
    assert.strictEqual(res.data.data.status, 'diajukan');
    assert.ok(Number.isInteger(res.data.data.id));
    assert.ok(!Number.isNaN(Date.parse(res.data.data.createdAt)));
    createdPengaduanId = res.data.data.id;
    return { status: res.status, sample: res.data };
  });

  await runCase('T06', 'Mahasiswa membaca pengaduan sendiri (list & detail)', async () => {
    const listRes = await httpRequest('GET', '/api/pengaduan', {
      token: mhs1Token
    });
    assert.strictEqual(listRes.status, 200);
    assert.ok(listRes.data.data.every((item) => item.mahasiswaId === '240104040185'));
    assert.ok(listRes.data.data.some((item) => item.id === createdPengaduanId));

    const detailRes = await httpRequest('GET', `/api/pengaduan/${createdPengaduanId}`, {
      token: mhs1Token
    });
    assert.strictEqual(detailRes.status, 200);
    assert.strictEqual(detailRes.data.data.id, createdPengaduanId);
    assert.strictEqual(detailRes.data.data.mahasiswaId, '240104040185');
    return { status: detailRes.status, sample: detailRes.data };
  });

  await runCase('T07', 'Mahasiswa mencoba membaca pengaduan orang lain', async () => {
    // ID 3 dimiliki oleh mhs2 (240104040199)
    const res = await httpRequest('GET', '/api/pengaduan/3', {
      token: mhs1Token
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.data.success, false);
    assert.strictEqual(res.data.error.code, 'FORBIDDEN_RESOURCE_ACCESS');
    return { status: res.status, sample: res.data };
  });

  await runCase('T08', 'Mahasiswa mencoba mengubah status pengaduan', async () => {
    const res = await httpRequest('PATCH', `/api/pengaduan/${createdPengaduanId}/status`, {
      token: mhs1Token,
      body: { status: 'selesai' }
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.data.success, false);
    assert.strictEqual(res.data.error.code, 'FORBIDDEN_ROLE');
    return { status: res.status, sample: res.data };
  });

  await runCase('T09', 'Admin melihat seluruh pengaduan', async () => {
    const res = await httpRequest('GET', '/api/pengaduan', {
      token: adminToken
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    const owners = new Set(res.data.data.map((item) => item.mahasiswaId));
    assert.ok(owners.has('240104040185'));
    assert.ok(owners.has('240104040199'));
    assert.strictEqual(res.data.meta.total, 4);
    return {
      status: res.status,
      sample: {
        success: res.data.success,
        message: res.data.message,
        meta: res.data.meta,
        ids: res.data.data.map((i) => ({ id: i.id, mahasiswaId: i.mahasiswaId, status: i.status }))
      }
    };
  });

  await runCase('T10', 'Admin memperbarui status pengaduan', async () => {
    const res = await httpRequest('PATCH', `/api/pengaduan/${createdPengaduanId}/status`, {
      token: adminToken,
      body: { status: 'diproses' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.status, 'diproses');
    assert.strictEqual(res.data.data.mahasiswaId, '240104040185');
    return { status: res.status, sample: res.data };
  });

  await runCase('T11', 'Membuat pengaduan dengan field wajib kosong', async () => {
    const beforeCount = (
      await httpRequest('GET', '/api/pengaduan', { token: adminToken })
    ).data.meta.total;

    const res = await httpRequest('POST', '/api/pengaduan', {
      token: mhs1Token,
      body: { judul: '', kategori: '', deskripsi: '' }
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.success, false);
    assert.strictEqual(res.data.error.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(res.data.error.details) && res.data.error.details.length >= 3);

    const afterCount = (
      await httpRequest('GET', '/api/pengaduan', { token: adminToken })
    ).data.meta.total;
    assert.strictEqual(afterCount, beforeCount);
    return { status: res.status, sample: res.data };
  });

  await runCase('T12', 'Mengakses ID pengaduan yang tidak ditemukan', async () => {
    const res = await httpRequest('GET', '/api/pengaduan/9999', {
      token: adminToken
    });
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.data.success, false);
    assert.strictEqual(res.data.error.code, 'PENGADUAN_NOT_FOUND');
    return { status: res.status, sample: res.data };
  });

  // ------------------------------------------------------------------
  // PENGUJIAN KEAMANAN & INTEGRITAS TAMBAHAN (T13 - T20)
  // ------------------------------------------------------------------

  await runCase('T13', 'Menolak field terlarang (id, mahasiswaId, status, createdAt) saat POST', async () => {
    const beforeCount = (
      await httpRequest('GET', '/api/pengaduan', { token: adminToken })
    ).data.meta.total;

    const res = await httpRequest('POST', '/api/pengaduan', {
      token: mhs1Token,
      body: {
        id: 99,
        mahasiswaId: '240104040199',
        status: 'selesai',
        createdAt: '2020-01-01T00:00:00.000Z',
        judul: 'Uji Manipulasi Field Terlarang',
        kategori: 'TI',
        deskripsi: 'Mencoba menyisipkan field yang seharusnya dikelola server.'
      }
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.error.code, 'VALIDATION_ERROR');

    const afterCount = (
      await httpRequest('GET', '/api/pengaduan', { token: adminToken })
    ).data.meta.total;
    assert.strictEqual(afterCount, beforeCount);
    return { status: res.status, sample: res.data };
  });

  await runCase('T14', 'Mahasiswa mengubah pengaduan miliknya yang berstatus diajukan (PUT)', async () => {
    // ID 1 milik mhs1 berstatus diajukan
    const res = await httpRequest('PUT', '/api/pengaduan/1', {
      token: mhs1Token,
      body: {
        judul: 'Lampu Ruang Kuliah TI-203 Padam Total',
        kategori: 'Fasilitas',
        deskripsi: 'Seluruh lampu neon di Ruang Kuliah TI-203 padam total dan perlu penggantian segera.'
      }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.id, 1);
    assert.strictEqual(res.data.data.mahasiswaId, '240104040185');
    assert.strictEqual(res.data.data.status, 'diajukan');
    assert.strictEqual(res.data.data.judul, 'Lampu Ruang Kuliah TI-203 Padam Total');
    return { status: res.status, sample: res.data };
  });

  await runCase('T15', 'Mahasiswa ditolak mengubah pengaduan yang sudah berstatus diproses', async () => {
    // ID createdPengaduanId milik mhs1 tetapi status sudah diubah admin menjadi diproses di T10
    const res = await httpRequest('PUT', `/api/pengaduan/${createdPengaduanId}`, {
      token: mhs1Token,
      body: {
        judul: 'Mencoba Mengubah Setelah Diproses',
        kategori: 'Fasilitas',
        deskripsi: 'Pengubahan ini harus ditolak karena status bukan lagi diajukan.'
      }
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.data.error.code, 'PENGADUAN_STATUS_LOCKED');
    return { status: res.status, sample: res.data };
  });

  await runCase('T16', 'Mahasiswa menghapus pengaduan miliknya yang berstatus diajukan (DELETE)', async () => {
    const res = await httpRequest('DELETE', '/api/pengaduan/1', {
      token: mhs1Token
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.id, 1);

    const checkDeleted = await httpRequest('GET', '/api/pengaduan/1', {
      token: mhs1Token
    });
    assert.strictEqual(checkDeleted.status, 404);
    return { status: res.status, sample: res.data };
  });

  await runCase('T17', 'Admin ditolak membuat, mengubah isi, dan menghapus pengaduan (403)', async () => {
    const postRes = await httpRequest('POST', '/api/pengaduan', {
      token: adminToken,
      body: {
        judul: 'Admin Tidak Boleh Buat',
        kategori: 'TI',
        deskripsi: 'Administrator tidak memiliki hak untuk membuat pengaduan.'
      }
    });
    const putRes = await httpRequest('PUT', '/api/pengaduan/3', {
      token: adminToken,
      body: {
        judul: 'Admin Tidak Boleh Ubah',
        kategori: 'TI',
        deskripsi: 'Administrator tidak memiliki hak mengubah isi pengaduan.'
      }
    });
    const delRes = await httpRequest('DELETE', '/api/pengaduan/3', {
      token: adminToken
    });

    assert.strictEqual(postRes.status, 403);
    assert.strictEqual(putRes.status, 403);
    assert.strictEqual(delRes.status, 403);
    return {
      status: 403,
      sample: { post: postRes.status, put: putRes.status, delete: delRes.status }
    };
  });

  await runCase('T18', 'Menolak token JWT yang sudah kedaluwarsa (401)', async () => {
    const expiredToken = jwt.sign(
      { sub: '240104040185', username: 'mhs1', role: 'mahasiswa' },
      env.JWT_SECRET,
      { expiresIn: -10, issuer: 'simadu-api' }
    );
    const res = await httpRequest('GET', '/api/pengaduan', {
      token: expiredToken
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.data.error.code, 'AUTH_TOKEN_EXPIRED');
    return { status: res.status, sample: res.data };
  });

  await runCase('T19', 'Menolak format JSON rusak / malformed JSON (400)', async () => {
    const res = await httpRequest('POST', '/api/pengaduan', {
      token: mhs1Token,
      headers: { 'Content-Type': 'application/json' },
      rawBody: '{"judul": "JSON Rusak"'
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.error.code, 'MALFORMED_JSON');
    return { status: res.status, sample: res.data };
  });

  await runCase('T20', 'Swagger UI (/api-docs) dan spesifikasi OpenAPI (/api-docs.json) aktif', async () => {
    const uiRes = await httpRequest('GET', '/api-docs/');
    const jsonRes = await httpRequest('GET', '/api-docs.json');
    assert.strictEqual(uiRes.status, 200);
    assert.ok(typeof uiRes.data === 'string' && uiRes.data.includes('Swagger'));
    assert.strictEqual(jsonRes.status, 200);
    assert.strictEqual(jsonRes.data.openapi, '3.0.3');
    return {
      status: 200,
      sample: { swaggerUiStatus: uiRes.status, openApiVersion: jsonRes.data.openapi }
    };
  });

  await new Promise((resolve) => server.close(resolve));

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;

  console.log('\n====================================================================');
  console.log(`RINGKASAN PENGUJIAN: ${passedCount}/${results.length} PASS | ${failedCount} FAIL`);
  console.log('====================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  if (server) server.close();
  process.exit(1);
});
