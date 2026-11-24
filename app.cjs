'use strict';

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');

const env = require('./src/config/env.cjs');
const authRoutes = require('./src/routes/auth.routes.cjs');
const pengaduanRoutes = require('./src/routes/pengaduan.routes.cjs');
const { requestLogger } = require('./src/middleware/requestLogger.middleware.cjs');
const {
  notFoundHandler,
  errorHandler
} = require('./src/middleware/error.middleware.cjs');
const { sendSuccess } = require('./src/utils/response.cjs');

const app = express();

// Security headers (nonaktifkan CSP ketat hanya untuk kompatibilitas aset Swagger UI)
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

// CORS
const corsOptions =
  env.CORS_ORIGIN === '*'
    ? { origin: '*' }
    : {
        origin: env.CORS_ORIGIN.split(',').map((item) => item.trim())
      };
app.use(cors(corsOptions));

// Parsing JSON body dengan batas ukuran aman
app.use(express.json({ limit: '100kb', strict: true }));

// Logging aman tanpa mencatat token/password
app.use(requestLogger);

// Muat dokumen spesifikasi OpenAPI 3.0
const openApiPath = path.join(__dirname, 'docs', 'openapi.json');
const openApiDocument = JSON.parse(fs.readFileSync(openApiPath, 'utf8'));

// Endpoint informasi layanan & health check
app.get('/', (req, res) => {
  return sendSuccess(res, 200, 'SIMADU API aktif', {
    service: 'SIMADU API — Sistem Layanan Informasi dan Pengaduan Mahasiswa',
    version: '1.0.0',
    mahasiswa: {
      nama: 'Ahmad Padla Kamal',
      nim: '240104040185',
      kelas: 'TI24B',
      prodi: 'Teknologi Informasi, UIN Antasari Banjarmasin',
      dosenPengampu: 'Muhayat, M.IT'
    },
    documentation: '/api-docs',
    openApiSpec: '/api-docs.json'
  });
});

app.get('/api/health', (req, res) => {
  return sendSuccess(res, 200, 'OK', {
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Dokumentasi OpenAPI & Swagger UI
app.get('/api-docs.json', (req, res) => {
  return res.status(200).json(openApiDocument);
});

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    explorer: true,
    customSiteTitle: 'SIMADU API — Swagger UI'
  })
);

// Route utama API
app.use('/api/auth', authRoutes);
app.use('/api/pengaduan', pengaduanRoutes);

// Penanganan route 404 dan error global
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
