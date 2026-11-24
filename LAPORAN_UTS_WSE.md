# LAPORAN UJIAN TENGAH SEMESTER (UTS)
## WEB SERVICE ENGINEERING — PROYEK SIMADU API

---

### Identitas Mahasiswa

| Komponen | Keterangan |
|---|---|
| **Nama** | Ahmad Padla Kamal |
| **NIM** | 240104040185 |
| **Lokal / Kelas** | TI24B |
| **Program Studi** | Teknologi Informasi, Fakultas Dakwah dan Ilmu Komunikasi / UIN Antasari Banjarmasin |
| **Mata Kuliah** | Web Service Engineering (3 SKS) |
| **Dosen Pengampu** | Muhayat, M.IT |
| **Judul Proyek** | Sistem Layanan Informasi dan Pengaduan Mahasiswa (`SIMADU API`) |
| **Teknologi** | Node.js v24.21.0, Express 5, CommonJS (`.cjs`), `bcryptjs`, `jsonwebtoken`, `swagger-ui-express`, OpenAPI 3.0.3 |

---

## 1. Analisis Kebutuhan dan Perancangan REST API (Soal 1)

### 1.1 Identifikasi Aktor & Hak Akses
Sistem melayani dua aktor utama dengan hak akses berbeda:
1. **Mahasiswa (`role: "mahasiswa"`):** Menyampaikan pengaduan baru, melihat daftar & detail pengaduan miliknya sendiri, serta mengubah atau menghapus pengaduannya sendiri selama status masih `"diajukan"`.
2. **Administrator (`role: "admin"`):** Melihat seluruh pengaduan dari semua mahasiswa dan memperbarui status penanganan (`diajukan` / `diproses` / `selesai`). Administrator **tidak dapat** membuat pengaduan, mengubah isi/identitas pemilik, atau menghapus pengaduan.

### 1.2 Resource Utama
1. **Auth (`/api/auth`):** Pengelolaan autentikasi kredensial pengguna dan penerbitan JWT Bearer Token.
2. **Pengaduan (`/api/pengaduan`):** Pengelolaan data laporan/pengaduan mahasiswa dengan skema minimum:
   `id` (Integer), `mahasiswaId` (String), `judul` (String), `kategori` (`Fasilitas | Akademik | TI`), `deskripsi` (String), `status` (`diajukan | diproses | selesai`), `createdAt` (String ISO 8601).

### 1.3 Tabel Kontrak Endpoint

| No | Metode | Endpoint | Aktor Diizinkan | Request Body / Param | Status Sukses | Status Gagal |
|---|---|---|---|---|---|---|
| 1 | `POST` | `/api/auth/login` | Publik (Mahasiswa, Admin) | `{ "username": "mhs1", "password": "..." }` | `200 OK` (token JWT + profil user tanpa hash) | `400` (payload salah), `401` (kredensial salah) |
| 2 | `GET` | `/api/pengaduan` | Mahasiswa (milik sendiri), Admin (semua) | Query opsional `?kategori=&status=` | `200 OK` (array pengaduan + `meta.total`) | `400` (filter invalid), `401` (tanpa/token invalid) |
| 3 | `GET` | `/api/pengaduan/:id` | Mahasiswa (milik sendiri), Admin (semua) | Path param `:id` (integer positif) | `200 OK` (objek pengaduan) | `400`, `401`, `403` (milik orang lain), `404` |
| 4 | `POST` | `/api/pengaduan` | Khusus Mahasiswa | `{ "judul", "kategori", "deskripsi" }` | `201 Created` (pengaduan baru, `status: "diajukan"`) | `400` (kosong/field terlarang), `401`, `403` (Admin) |
| 5 | `PUT` | `/api/pengaduan/:id` | Khusus Mahasiswa pemilik (status `diajukan`) | `{ "judul", "kategori", "deskripsi" }` | `200 OK` (pengaduan terbarui) | `400`, `401`, `403` (bukan pemilik/Admin/status terkunci), `404` |
| 6 | `PATCH` | `/api/pengaduan/:id/status` | Khusus Admin | `{ "status": "diajukan\|diproses\|selesai" }` | `200 OK` (status terbarui, `mahasiswaId` tetap) | `400`, `401`, `403` (Mahasiswa), `404` |
| 7 | `DELETE` | `/api/pengaduan/:id` | Khusus Mahasiswa pemilik (status `diajukan`) | Path param `:id` | `200 OK` (`{ "id": ... }`) | `400`, `401`, `403` (bukan pemilik/Admin/status terkunci), `404` |
| 8 | `GET` | `/api-docs` | Publik | — | `200 OK` (Halaman Swagger UI) | — |

### 1.4 Struktur JSON Request & Response Standar

**Format Respons Sukses:**
```json
{
  "success": true,
  "message": "Pengaduan berhasil dibuat",
  "data": {
    "id": 4,
    "mahasiswaId": "240104040185",
    "judul": "Proyektor Lab Komputer 2 Tidak Menyala",
    "kategori": "Fasilitas",
    "deskripsi": "Proyektor pada Laboratorium Komputer 2 tidak dapat menyala meskipun kabel daya sudah terpasang.",
    "status": "diajukan",
    "createdAt": "2026-11-24T06:46:28.131Z"
  }
}
```

**Format Respons Kesalahan:**
```json
{
  "success": false,
  "message": "Validasi data pengaduan gagal",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      { "field": "judul", "message": "Field judul wajib diisi berupa teks" }
    ]
  }
}
```

### 1.5 Diagram Arsitektur Consumer–Provider & Lapisan Sistem

```text
+-----------------------------------+
|  CONSUMER (Web / Mobile / Client) |
|  Postman / Swagger UI / Browser   |
+-----------------+-----------------+
                  |  HTTP/JSON + Authorization: Bearer <JWT>
                  v
+-------------------------------------------------------------------+
|                    PROVIDER: SIMADU API (Express 5)               |
|                                                                   |
|  [Security & Global Middleware]                                   |
|   helmet -> cors -> express.json -> requestLogger (tanpa token)   |
|                  |                                                |
|                  v                                                |
|  [Router Layer]  src/routes/auth.routes.cjs & pengaduan.routes.cjs|
|                  |                                                |
|                  v                                                |
|  [Route Middleware]                                               |
|   auth.middleware (JWT verify) -> role.middleware (RBAC)          |
|   -> validate.middleware (strict schema & forbidden fields)       |
|                  |                                                |
|                  v                                                |
|  [Controller Layer]  src/controllers/*.controller.cjs             |
|   Menerima req tervalidasi -> panggil service -> kirim JSON       |
|                  |                                                |
|                  v                                                |
|  [Service Layer]     src/services/*.service.cjs                   |
|   Aturan bisnis: bcrypt compare, JWT sign, ownership, status lock |
|                  |                                                |
|                  v                                                |
|  [Repository Layer]  src/repositories/*.repository.cjs            |
|   Akses data terisolasi (users & pengaduan seed store)            |
|                                                                   |
|  [Central Error Handler]  src/middleware/error.middleware.cjs     |
|   Menangani 400, 401, 403, 404, 500 secara konsisten & aman       |
+-------------------------------------------------------------------+
```

---

## 2. Implementasi REST API & Mekanisme Keamanan (Soal 2 & 3)

### 2.1 Pembagian Tanggung Jawab Kode
- **`src/routes/`**: Memetakan metode HTTP & URI serta menyusun rantai middleware keamanan per endpoint.
- **`src/middleware/`**:
  - `auth.middleware.cjs`: Memeriksa header `Authorization: Bearer <token>`, memverifikasi signature + `issuer` + `exp` JWT, serta memastikan pengguna pemilik token masih valid di repository.
  - `role.middleware.cjs`: Menerapkan matriks RBAC (`authorizeRoles('mahasiswa')`, `authorizeRoles('admin')`, atau keduanya).
  - `validate.middleware.cjs`: Memvalidasi tipe data, panjang string, enum kategori & status, format integer positif untuk `:id`, dan secara eksplisit menolak field terlarang (`id`, `mahasiswaId`, `status`, `createdAt`) maupun field tak dikenal.
  - `requestLogger.middleware.cjs`: Mencatat timestamp, method, path, status, dan durasi **tanpa pernah mencatat token maupun password**.
  - `error.middleware.cjs`: Menangani `SyntaxError` JSON rusak (`400`), `AppError` (`400/401/403/404`), dan error tak terduga (`500`) tanpa membocorkan stack trace.
- **`src/controllers/`**: Mengambil data bersih dari `req.validatedBody` / `req.validatedId` / `req.user`, memanggil service, lalu mengembalikan respons via `sendSuccess`.
- **`src/services/`**: Menegakkan aturan kepemilikan (`pengaduan.mahasiswaId === currentUser.id`) dan penguncian status (`existing.status === 'diajukan'`) untuk operasi `PUT` dan `DELETE`.
- **`src/repositories/`**: Menyediakan 2 akun mahasiswa (`mhs1` NIM `240104040185`, `mhs2` NIM `240104040199`) dan 1 akun admin (`admin` ID `ADM001`) dengan password ter-hash `bcryptjs` (10 rounds) serta 3 data pengaduan awal.

### 2.2 Matriks Hak Akses yang Diimplementasikan

| Operasi | Endpoint | Mahasiswa | Admin | Aturan Tambahan |
|---|---|---|---|---|
| Melihat pengaduan sendiri | `GET /api/pengaduan`, `GET /api/pengaduan/:id` | ✓ | ✓ | Mahasiswa otomatis difilter `mahasiswaId === req.user.id` |
| Melihat semua pengaduan | `GET /api/pengaduan` | × | ✓ | Mahasiswa yang mengakses ID milik orang lain mendapat `403` |
| Membuat pengaduan | `POST /api/pengaduan` | ✓ | × (`403`) | `mahasiswaId` dari JWT, `status` otomatis `"diajukan"` |
| Mengubah pengaduan sendiri | `PUT /api/pengaduan/:id` | ✓ | × (`403`) | Hanya pemilik & selama status masih `"diajukan"` |
| Menghapus pengaduan sendiri | `DELETE /api/pengaduan/:id` | ✓ | × (`403`) | Hanya pemilik & selama status masih `"diajukan"` |
| Mengubah status pengaduan | `PATCH /api/pengaduan/:id/status` | × (`403`) | ✓ | Hanya field `status`; `mahasiswaId` tidak berubah |

---

## 3. Hasil Pengujian Fungsional dan Keamanan (Soal 4)

Pengujian dilakukan secara otomatis melalui script [`tests/simadu.test.cjs`](./tests/simadu.test.cjs) menggunakan permintaan HTTP nyata terhadap server Express 5 (`npm test`). Seluruh **12 skenario wajib (T01–T12)** ditambah **8 skenario keamanan & integritas tambahan (T13–T20)** lulus **20/20 PASS (100%)**.

### 3.1 Tabel Hasil Pengujian 12 Skenario Wajib

| No | Skenario Pengujian | Metode & Endpoint | Harapan | Status Aktual | Ringkasan Bukti Respons Aktual | Hasil |
|---|---|---|---|---|---|---|
| **T01** | Login dengan kredensial benar (`mhs1` / `mhs12345`) | `POST /api/auth/login` | `200`, token diterima | `200` | `{"success":true,"message":"Login berhasil","tokenType":"Bearer","expiresIn":"1h","user":{"id":"240104040185","role":"mahasiswa"}}` | **PASS** |
| **T02** | Login dengan password salah | `POST /api/auth/login` | `401` | `401` | `{"success":false,"message":"Username atau password tidak valid","error":{"code":"INVALID_CREDENTIALS"}}` | **PASS** |
| **T03** | Akses endpoint terlindungi tanpa token | `GET /api/pengaduan` | `401` | `401` | `{"success":false,"message":"Header Authorization dengan Bearer Token wajib disertakan","error":{"code":"AUTH_TOKEN_MISSING"}}` | **PASS** |
| **T04** | Akses menggunakan token tidak valid | `GET /api/pengaduan` | `401` | `401` | `{"success":false,"message":"Token autentikasi tidak valid","error":{"code":"AUTH_TOKEN_INVALID"}}` | **PASS** |
| **T05** | Mahasiswa membuat pengaduan valid | `POST /api/pengaduan` | `201` | `201` | `{"success":true,"message":"Pengaduan berhasil dibuat","data":{"id":4,"mahasiswaId":"240104040185","status":"diajukan",...}}` | **PASS** |
| **T06** | Mahasiswa membaca pengaduan sendiri | `GET /api/pengaduan` & `GET /api/pengaduan/4` | `200` | `200` | Hanya menampilkan pengaduan milik `240104040185`; detail ID 4 berhasil diambil | **PASS** |
| **T07** | Mahasiswa mencoba membaca pengaduan orang lain (ID 3 milik `mhs2`) | `GET /api/pengaduan/3` | `403` | `403` | `{"success":false,"message":"Anda tidak memiliki izin untuk melihat pengaduan milik mahasiswa lain","error":{"code":"FORBIDDEN_RESOURCE_ACCESS"}}` | **PASS** |
| **T08** | Mahasiswa mengubah status pengaduan | `PATCH /api/pengaduan/4/status` | `403` | `403` | `{"success":false,"message":"Akses ditolak. Operasi ini hanya diizinkan untuk role: admin","error":{"code":"FORBIDDEN_ROLE"}}` | **PASS** |
| **T09** | Admin melihat seluruh pengaduan | `GET /api/pengaduan` | `200` | `200` | Mengembalikan 4 pengaduan lintas mahasiswa (`240104040185` dan `240104040199`) dengan `meta.total: 4` | **PASS** |
| **T10** | Admin memperbarui status pengaduan | `PATCH /api/pengaduan/4/status` | `200` | `200` | Status ID 4 berubah menjadi `"diproses"`, `mahasiswaId` tetap `"240104040185"` | **PASS** |
| **T11** | Membuat pengaduan dengan field wajib kosong | `POST /api/pengaduan` | `400` | `400` | `VALIDATION_ERROR` mencantumkan detail error `judul`, `kategori`, `deskripsi`; jumlah data tidak bertambah | **PASS** |
| **T12** | Mengakses ID pengaduan tidak ditemukan | `GET /api/pengaduan/9999` | `404` | `404` | `{"success":false,"message":"Pengaduan dengan ID 9999 tidak ditemukan","error":{"code":"PENGADUAN_NOT_FOUND"}}` | **PASS** |

### 3.2 Pengujian Keamanan & Integritas Tambahan (T13–T20)

| Kode | Skenario Pengujian Tambahan | Harapan | Status Aktual | Hasil |
|---|---|---|---|---|
| **T13** | Menolak field terlarang (`id`, `mahasiswaId`, `status`, `createdAt`) saat `POST` dan memastikan data tidak berubah | `400` | `400` (`VALIDATION_ERROR`) | **PASS** |
| **T14** | Mahasiswa mengubah isi pengaduan miliknya yang berstatus `diajukan` (`PUT /api/pengaduan/1`) | `200` | `200` (`id`, `mahasiswaId`, `status`, `createdAt` tetap) | **PASS** |
| **T15** | Mahasiswa ditolak mengubah pengaduan yang sudah berstatus `diproses` | `403` | `403` (`PENGADUAN_STATUS_LOCKED`) | **PASS** |
| **T16** | Mahasiswa menghapus pengaduan miliknya yang berstatus `diajukan` (`DELETE /api/pengaduan/1`) | `200` | `200` (cek `GET` berikutnya `404`) | **PASS** |
| **T17** | Admin ditolak melakukan `POST`, `PUT`, dan `DELETE` pengaduan | `403` | `403` pada ketiga operasi | **PASS** |
| **T18** | Menolak JWT yang sudah kedaluwarsa (`TokenExpiredError`) | `401` | `401` (`AUTH_TOKEN_EXPIRED`) | **PASS** |
| **T19** | Menolak JSON tidak valid / rusak (*malformed JSON*) | `400` | `400` (`MALFORMED_JSON`) | **PASS** |
| **T20** | Halaman Swagger UI (`/api-docs`) dan file spesifikasi (`/api-docs.json`) dapat diakses | `200` | `200` (`openapi: 3.0.3`) | **PASS** |

---

## 4. Jawaban 10 Pertanyaan Demonstrasi (Bagian F)

### 1. Apa perbedaan autentikasi dan otorisasi? Tunjukkan implementasinya di dalam kode.
- **Autentikasi (*Authentication*)** adalah proses memverifikasi **siapa** pengguna tersebut (identitas), misalnya memeriksa pasangan username/password saat login atau memvalidasi keaslian JWT Bearer Token pada setiap permintaan.
- **Otorisasi (*Authorization*)** adalah proses menentukan **apa yang boleh dilakukan** oleh pengguna yang sudah terautentikasi berdasarkan peran (*role*) dan kepemilikan resource (*ownership*).
- **Implementasi di kode SIMADU API:**
  - *Autentikasi:* `src/services/auth.service.cjs` (`bcrypt.compare` & `jwt.sign`) dan `src/middleware/auth.middleware.cjs` (`authenticate` memverifikasi header `Bearer <token>` via `jwt.verify` dan menempelkan `req.user`).
  - *Otorisasi:* `src/middleware/role.middleware.cjs` (`authorizeRoles('mahasiswa')` / `authorizeRoles('admin')`) untuk kontrol berbasis role, serta `src/services/pengaduan.service.cjs` (`pengaduan.mahasiswaId !== currentUser.id` dan `existing.status !== 'diajukan'`) untuk kontrol kepemilikan dan kebijakan status.

### 2. Mengapa mahasiswa yang berhasil login belum tentu boleh mengakses semua endpoint?
Keberhasilan login hanya membuktikan bahwa mahasiswa tersebut adalah pengguna sah yang terdaftar (**autentikasi berhasil**), bukan berarti ia memiliki wewenang atas seluruh operasi di sistem. Sesuai prinsip *Least Privilege* (hak akses minimum) dan pemisahan tanggung jawab:
- Mahasiswa tidak boleh melihat, mengubah, atau menghapus pengaduan milik mahasiswa lain demi menjaga privasi dan integritas data.
- Mahasiswa tidak boleh mengakses `PATCH /api/pengaduan/:id/status` karena pembaruan status penanganan adalah kewenangan eksklusif Administrator.

### 3. Apa perbedaan respons HTTP 401 dan 403?
- **`401 Unauthorized` (Gagal Autentikasi):** Identitas pemanggil belum diketahui atau tidak sah — misalnya password login salah, header `Authorization` tidak dikirim, format bukan `Bearer <token>`, signature JWT tidak valid, atau token sudah kedaluwarsa (`exp` terlampaui). Solusinya adalah melakukan login / menyertakan token yang valid.
- **`403 Forbidden` (Gagal Otorisasi):** Identitas pemanggil sudah terverifikasi dengan token yang valid, **tetapi** pengguna tersebut tidak mempunyai hak akses untuk operasi atau resource yang diminta — misalnya Mahasiswa mengakses pengaduan mahasiswa lain, Mahasiswa mencoba `PATCH .../status`, Admin mencoba `POST /api/pengaduan`, atau Mahasiswa mencoba mengubah pengaduan yang statusnya sudah `diproses`.

### 4. Bagaimana API memastikan seorang mahasiswa hanya dapat mengubah pengaduannya sendiri?
SIMADU API menerapkan tiga lapis pengamanan berurutan pada `PUT /api/pengaduan/:id`:
1. **Identitas diambil dari server, bukan client:** `auth.middleware.cjs` mengekstrak `req.user.id` dari payload JWT yang telah diverifikasi signature-nya (`sub`), sementara `validate.middleware.cjs` menolak field `mahasiswaId` bila dikirim di body request.
2. **Pembatasan Role:** `authorizeRoles('mahasiswa')` memastikan hanya role mahasiswa yang dapat mengakses endpoint.
3. **Verifikasi Kepemilikan & Status di Service Layer (`src/services/pengaduan.service.cjs`):** Sebelum pembaruan dijalankan, service mengambil data dari repository lalu memeriksa `if (existing.mahasiswaId !== currentUser.id)` -> lempar `403 FORBIDDEN_OWNERSHIP`, dan `if (existing.status !== 'diajukan')` -> lempar `403 PENGADUAN_STATUS_LOCKED`. Repository `updateContent` juga hanya memperbarui `judul`, `kategori`, dan `deskripsi`, sehingga `id`, `mahasiswaId`, `status`, dan `createdAt` tidak pernah berubah.

### 5. Mengapa password harus di-hash dan mengapa token tidak boleh dicatat ke log?
- **Mengapa password harus di-hash (`bcryptjs`):** Hashing bersifat satu arah (*one-way*) dan menggunakan *salt* acak per akun serta *cost factor* (10 rounds) sehingga lambat untuk serangan *brute-force*. Jika basis data atau memori pengguna bocor, penyerang tidak bisa membaca password asli mahasiswa/admin, apalagi memakainya untuk serangan *credential stuffing* ke layanan lain.
- **Mengapa token tidak boleh dicatat ke log:** Bearer Token berfungsi layaknya kunci sesi aktif (*bearer credential*) — siapa pun yang memiliki token tersebut dapat menyamar (*impersonate*) sebagai pengguna pemiliknya selama token belum kedaluwarsa. File log sering disimpan dalam teks biasa, dibagikan untuk debugging, atau diakses operator non-admin; mencatat header `Authorization` ke log akan membuka celah *session hijacking*. Karena itu `requestLogger.middleware.cjs` hanya mencatat timestamp, method, path, status, dan durasi.

### 6. Bagaimana sebuah input yang salah ditangani oleh middleware dan error handler?
Alurnya berjalan terstruktur dari gerbang masuk hingga respons JSON:
1. Jika body JSON tidak valid secara sintaksis (*malformed JSON*), `express.json()` melempar `SyntaxError` yang langsung ditangkap `error.middleware.cjs` dan diubah menjadi respons `400 Bad Request` dengan kode `MALFORMED_JSON`.
2. Jika JSON valid, `validate.middleware.cjs` memeriksa parameter `:id`, query filter, struktur objek body, penolakan field terlarang (`id`, `mahasiswaId`, `status`, `createdAt`), dan aturan tiap field (`judul`, `kategori`, `deskripsi`, `status`). Jika ada pelanggaran, middleware memanggil `next(new AppError(400, '...', 'VALIDATION_ERROR', errors))` sehingga eksekusi **dihentikan sebelum mencapai controller, service, maupun repository**.
3. `error.middleware.cjs` menerima `AppError` tersebut dan mengirimkan JSON error konsisten (`success: false`, `message`, `error.code`, `error.details`) tanpa membocorkan stack trace atau detail internal server.

### 7. Apa perbedaan HTTPS dengan autentikasi Bearer Token?
- **HTTPS (HTTP over TLS/SSL)** bekerja pada **lapisan transport** untuk mengenkripsi seluruh saluran komunikasi antara client dan server, memastikan integritas pesan selama transit, dan memverifikasi identitas server (melalui sertifikat TLS) agar mencegah penyadapan (*eavesdropping*) dan serangan *Man-in-the-Middle (MITM)*.
- **Autentikasi Bearer Token (JWT)** bekerja pada **lapisan aplikasi** untuk mengidentifikasi **siapa pengguna** yang mengirim permintaan HTTP dan membawa klaim identitas/role.
- **Hubungannya saling melengkapi:** Tanpa HTTPS, Bearer Token yang dikirim lewat header `Authorization` dapat disadap di jaringan publik; sebaliknya, HTTPS saja tanpa autentikasi Bearer Token tidak mengetahui apakah permintaan berasal dari Mahasiswa A, Mahasiswa B, atau Administrator.

### 8. Bagaimana membuktikan bahwa input yang ditolak tidak mengubah data?
Dengan melakukan **verifikasi kondisi sebelum dan sesudah permintaan ditolak** (seperti diimplementasikan otomatis pada skenario `T11` dan `T13` di `tests/simadu.test.cjs`):
1. Ambil snapshot data awal (jumlah total pengaduan lewat `GET /api/pengaduan` atau isi record tertentu lewat `GET /api/pengaduan/:id`).
2. Kirim permintaan tidak valid (misalnya field kosong `T11`, field terlarang `id`/`mahasiswaId`/`status` `T13`, atau upaya `PUT` pada status `diproses` `T15`) dan pastikan server menolak dengan `400` atau `403`.
3. Ambil ulang data setelah penolakan dan buktikan secara terukur (`assert.strictEqual(afterCount, beforeCount)` serta field record tidak berubah sama sekali) bahwa tidak ada penambahan, modifikasi, maupun penghapusan di repository.

### 9. Mengapa dokumentasi Swagger yang tampil belum cukup membuktikan API berjalan dengan benar?
File `docs/openapi.json` pada Swagger UI hanyalah **spesifikasi deklaratif** (kontrak dokumentasi statis) yang ditulis pengembang. Swagger UI tetap bisa tampil mulus meskipun implementasi endpoint di belakangnya masih kosong, salah kode status, lupa memasang middleware RBAC, atau gagal memvalidasi field terlarang. Pembuktian kebenaran API wajib dilakukan melalui **pengujian eksekusi nyata** (seperti `tests/simadu.test.cjs` atau Postman) terhadap skenario positif (*happy path*) maupun skenario negatif (token invalid, lintas kepemilikan, role terlarang, input kosong, field terlarang, dan ID tidak ditemukan) serta memeriksa status HTTP dan perubahan state data aktualnya.

### 10. Apa yang harus diperbaiki agar layanan ini layak diterapkan pada lingkungan produksi?
Beberapa peningkatan penting untuk kesiapan produksi:
1. **Basis Data Persisten & Migrasi:** Mengganti penyimpanan in-memory (`pengaduanStore` & `users`) dengan database relasional terindeks (PostgreSQL/MySQL) atau MongoDB lengkap dengan skema migrasi dan transaksi.
2. **HTTPS / TLS Wajib & Secret Management:** Menjalankan API di balik reverse proxy (Nginx/Caddy/Cloud Load Balancer) dengan sertifikat TLS aktif, HSTS, dan menyimpan `JWT_SECRET` di secret manager (bukan default fallback).
3. **Manajemen Siklus Token Lebih Kuat:** Menggunakan *short-lived Access Token* (misalnya 15 menit) + *Refresh Token* dengan rotasi & mekanisme *revocation/blacklist* (misalnya di Redis) untuk fitur logout dan pembatalan sesi.
4. **Rate Limiting & Proteksi Brute-Force:** Menambahkan `express-rate-limit` khususnya pada `/api/auth/login` untuk mencegah serangan *brute-force* dan *DoS*.
5. **Observabilitas & Audit Trail:** Menggunakan structured logging (Pino/Winston dengan *redaction* header sensitif), pencatatan audit perubahan status oleh admin, monitoring kesehatan, serta CI/CD dengan pengujian otomatis menyeluruh.
