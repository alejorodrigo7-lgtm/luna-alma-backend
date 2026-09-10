// routes/shifts.js
const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const {
  openShift,
  closeShift,
  getCurrentShift,
  getShifts,
  getShiftById,
  getShiftSummary
} = require('../controllers/shiftController');

router.post('/open', auth, checkRole('admin', 'vendedor'), openShift);
router.post('/close', auth, checkRole('admin', 'vendedor'), closeShift);
router.get('/current', auth, getCurrentShift);
router.get('/summary', auth, getShiftSummary);
router.get('/', auth, getShifts);
router.get('/:id', auth, getShiftById);

module.exports = router;