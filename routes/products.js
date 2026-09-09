const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  updateStock,
  deleteProduct,
  getInventorySummary
} = require('../controllers/productController');

router.get('/', auth, getProducts);
router.get('/summary', auth, getInventorySummary);
router.get('/:id', auth, getProductById);
router.post('/', auth, checkRole('admin', 'almacenista'), createProduct);
router.put('/:id', auth, checkRole('admin', 'almacenista'), updateProduct);
router.patch('/:id/stock', auth, checkRole('admin', 'almacenista'), updateStock);
router.delete('/:id', auth, checkRole('admin'), deleteProduct);

module.exports = router;