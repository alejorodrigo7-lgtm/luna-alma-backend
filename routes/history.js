// routes/history.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getMovements,
  getMovementsByProduct
} = require('../controllers/historyController');

router.get('/', auth, getMovements);
router.get('/product/:productId', auth, getMovementsByProduct);

module.exports = router;