const Product = require('../models/Product');
const InventoryMovement = require('../models/InventoryMovement');

// Obtener todos los productos
const getProducts = async (req, res) => {
  try {
    const { category, stockLow, search } = req.query;
    let filter = { active: true };
    
    if (category && category !== 'Todos') {
      filter.category = category;
    }
    
    if (stockLow === 'true') {
      filter.$expr = { $lte: ['$stock', '$minStock'] };
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const products = await Product.find(filter).sort({ name: 1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener un producto por ID
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Crear producto
const createProduct = async (req, res) => {
  try {
    const productData = req.body;
    
    // Verificar SKU duplicado
    const existing = await Product.findOne({ sku: productData.sku });
    if (existing) {
      return res.status(400).json({ message: 'El SKU ya existe' });
    }
    
    const product = new Product(productData);
    await product.save();
    
    // Registrar movimiento de entrada
    if (productData.stock > 0) {
      const movement = new InventoryMovement({
        productId: product._id,
        type: 'entry',
        quantity: productData.stock,
        previousStock: 0,
        newStock: productData.stock,
        userId: req.userId,
        notes: 'Creación inicial de producto'
      });
      await movement.save();
    }
    
    res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente',
      product
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Actualizar producto
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    res.json({
      success: true,
      message: 'Producto actualizado',
      product
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Actualizar stock
const updateStock = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity, notes } = req.body;
    
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    
    const previousStock = product.stock;
    product.stock += quantity;
    await product.save();
    
    // Registrar movimiento
    const movement = new InventoryMovement({
      productId: product._id,
      type: 'adjustment',
      quantity,
      previousStock,
      newStock: product.stock,
      userId: req.userId,
      notes: notes || 'Ajuste manual de inventario'
    });
    await movement.save();
    
    res.json({
      success: true,
      message: 'Stock actualizado',
      product,
      movement
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Eliminar producto (soft delete)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true }
    );
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    res.json({
      success: true,
      message: 'Producto desactivado'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener resumen de inventario
const getInventorySummary = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments({ active: true });
    const lowStock = await Product.countDocuments({
      active: true,
      $expr: { $lte: ['$stock', '$minStock'] }
    });
    const outOfStock = await Product.countDocuments({
      active: true,
      stock: 0
    });
    
    const categories = await Product.aggregate([
      { $match: { active: true } },
      { $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalStock: { $sum: '$stock' }
      }}
    ]);
    
    res.json({
      totalProducts,
      lowStock,
      outOfStock,
      categories
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  updateStock,
  deleteProduct,
  getInventorySummary
};