// routes/sales.js
const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const {
  createSale,
  getRecentSales,
  getTodaySummary,
  getSales,
  getSaleById,
  cancelSale
} = require('../controllers/saleController');

router.post('/', auth, checkRole('admin', 'vendedor'), createSale);
router.get('/', auth, getSales);
router.get('/recent', auth, getRecentSales);
router.get('/today-summary', auth, getTodaySummary);
router.get('/:id', auth, getSaleById);
router.patch('/:id/cancel', auth, checkRole('admin'), cancelSale);

module.exports = router;