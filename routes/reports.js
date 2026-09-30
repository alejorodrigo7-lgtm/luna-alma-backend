// routes/reports.js
const express = require('express');
const router = express.Router();
const {
  salesReport,
  inventoryReport,
  shiftsReport,
  profitReport,
  categoriesReport,
  topProductsReport,
  topClientsReport
} = require('../controllers/reportController');
const { auth } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(auth);

// Reportes
router.get('/sales', salesReport);
router.get('/inventory', inventoryReport);
router.get('/shifts', shiftsReport);
router.get('/profit', profitReport);
router.get('/categories', categoriesReport);
router.get('/top-products', topProductsReport);
router.get('/top-clients', topClientsReport);

module.exports = router;
