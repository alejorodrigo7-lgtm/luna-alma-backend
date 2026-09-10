// controllers/historyController.js
const InventoryMovement = require('../models/InventoryMovement');

// Obtener todos los movimientos con filtros
const getMovements = async (req, res) => {
  try {
    const { type, productId, startDate, endDate } = req.query;
    
    let filter = {};
    
    if (type && type !== 'todos') {
      filter.type = type;
    }
    
    if (productId) {
      filter.productId = productId;
    }
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    const movements = await InventoryMovement.find(filter)
      .sort({ createdAt: -1 })
      .populate('productId', 'name sku')
      .populate('userId', 'name')
      .limit(100);
    
    res.json({
      success: true,
      count: movements.length,
      movements
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener movimientos por producto
const getMovementsByProduct = async (req, res) => {
  try {
    const movements = await InventoryMovement.find({ 
      productId: req.params.productId 
    })
      .sort({ createdAt: -1 })
      .populate('userId', 'name');
    
    res.json({
      success: true,
      count: movements.length,
      movements
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMovements,
  getMovementsByProduct
};