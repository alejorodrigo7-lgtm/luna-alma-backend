// models/InventoryMovement.js
const mongoose = require('mongoose');

const InventoryMovementSchema = new mongoose.Schema({
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['entry', 'sale', 'adjustment'], // entrada, venta, ajuste
    required: true 
  },
  quantity: { 
    type: Number, 
    required: true 
  },
  previousStock: { 
    type: Number, 
    required: true 
  },
  newStock: { 
    type: Number, 
    required: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  saleId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Sale' 
  },
  notes: { 
    type: String 
  },
  reference: { 
    type: String 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('InventoryMovement', InventoryMovementSchema);