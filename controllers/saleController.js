// controllers/saleController.js
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Shift = require('../models/Shift');
const InventoryMovement = require('../models/InventoryMovement');

const IVA_RATE = 0.15; // 15% de IVA

// Crear una nueva venta
const createSale = async (req, res) => {
  try {
    const { clientName, clientEmail, products, paymentMethod } = req.body;
    
    // Validar campos obligatorios
    if (!clientName || !products || products.length === 0 || !paymentMethod) {
      return res.status(400).json({ 
        message: 'Cliente, productos y método de pago son obligatorios' 
      });
    }
    
    // Verificar turno activo
    const activeShift = await Shift.findOne({ 
      userId: req.userId, 
      status: 'open' 
    });
    
    if (!activeShift) {
      return res.status(400).json({ 
        message: 'No hay turno activo. Debe abrir un turno antes de vender.' 
      });
    }
    
    // Procesar productos y calcular totales
    let subtotal = 0;
    const productDetails = [];
    
    for (const item of products) {
      const product = await Product.findById(item.productId);
      
      if (!product) {
        return res.status(404).json({ 
          message: `Producto con ID ${item.productId} no encontrado` 
        });
      }
      
      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          message: `Stock insuficiente para ${product.name}. Disponible: ${product.stock}` 
        });
      }
      
      const itemSubtotal = product.salePrice * item.quantity;
      subtotal += itemSubtotal;
      
      productDetails.push({
        productId: product._id,
        sku: product.sku,
        name: product.name,
        quantity: item.quantity,
        unitPrice: product.salePrice,
        subtotal: itemSubtotal
      });
      
      // Actualizar stock
      const previousStock = product.stock;
      product.stock -= item.quantity;
      await product.save();
      
      // Registrar movimiento de inventario
      const movement = new InventoryMovement({
        productId: product._id,
        type: 'sale',
        quantity: -item.quantity,
        previousStock,
        newStock: product.stock,
        userId: req.userId,
        notes: 'Venta POS'
      });
      await movement.save();
    }
    
    const total = subtotal;                          // precio público (lo que paga el cliente)
    const baseGravable = total / (1 + IVA_RATE);     // base sin IVA
    const iva = total - baseGravable;                // IVA incluido
    subtotal = baseGravable;                         // reasignar subtotal a base gravable
    
    // Generar número de factura
    const count = await Sale.countDocuments();
    const invoice = `LA-2026-${String(count + 1).padStart(4, '0')}`;
    
    // Crear la venta
    const sale = new Sale({
      invoice,
      clientName,
      clientEmail,
      products: productDetails,
      subtotal,
      iva,
      total,
      paymentMethod,
      userId: req.userId,
      shiftId: activeShift._id
    });
    
    await sale.save();
    
    // Actualizar turno
    activeShift.totalSales += total;
    activeShift.saleCount += 1;
    
    if (paymentMethod === 'Efectivo') activeShift.totalCash += total;
    else if (paymentMethod === 'Tarjeta') activeShift.totalCard += total;
    else if (paymentMethod === 'Transferencia') activeShift.totalTransfer += total;
    
    activeShift.totalIva += iva;
    await activeShift.save();
    
    res.status(201).json({
      success: true,
      message: 'Venta registrada exitosamente',
      sale,
      invoice: {
        number: invoice,
        subtotal,
        iva,
        total,
        items: productDetails
      }
    });
    
  } catch (error) {
    console.error('Error en createSale:', error);
    res.status(500).json({ message: error.message });
  }
};

// Obtener ventas recientes
const getRecentSales = async (req, res) => {
  try {
    const sales = await Sale.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'name');
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener resumen de ventas de hoy
const getTodaySummary = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const sales = await Sale.find({
      createdAt: { $gte: today },
      status: 'completada'
    });
    
    const total = sales.reduce((sum, s) => sum + s.total, 0);
    const count = sales.length;
    
    const byMethod = {
      Efectivo: sales.filter(s => s.paymentMethod === 'Efectivo').reduce((sum, s) => sum + s.total, 0),
      Tarjeta: sales.filter(s => s.paymentMethod === 'Tarjeta').reduce((sum, s) => sum + s.total, 0),
      Transferencia: sales.filter(s => s.paymentMethod === 'Transferencia').reduce((sum, s) => sum + s.total, 0)
    };
    
    res.json({ total, count, byMethod });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener todas las ventas
const getSales = async (req, res) => {
  try {
    const sales = await Sale.find()
      .sort({ createdAt: -1 })
      .populate('userId', 'name');
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener venta por ID
const getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('userId', 'name')
      .populate('products.productId', 'name sku');
    if (!sale) {
      return res.status(404).json({ message: 'Venta no encontrada' });
    }
    res.json(sale);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Anular venta
const cancelSale = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ message: 'Venta no encontrada' });
    }
    
    if (sale.status === 'anulada') {
      return res.status(400).json({ message: 'La venta ya está anulada' });
    }
    
    // Restaurar stock
    for (const item of sale.products) {
      const product = await Product.findById(item.productId);
      if (product) {
        const previousStock = product.stock;
        product.stock += item.quantity;
        await product.save();
        
        const movement = new InventoryMovement({
          productId: product._id,
          type: 'adjustment',
          quantity: item.quantity,
          previousStock,
          newStock: product.stock,
          userId: req.userId,
          notes: `Anulación de venta ${sale.invoice}`
        });
        await movement.save();
      }
    }
    
    sale.status = 'anulada';
    await sale.save();
    
    res.json({
      success: true,
      message: 'Venta anulada exitosamente',
      sale
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createSale,
  getRecentSales,
  getTodaySummary,
  getSales,
  getSaleById,
  cancelSale
};