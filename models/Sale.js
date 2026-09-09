const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema({
  invoice: { 
    type: String, 
    required: true, 
    unique: true 
  },
  clientName: { 
    type: String, 
    required: true 
  },
  clientEmail: { 
    type: String 
  },
  clientPhone: { 
    type: String 
  },
  products: [{
    productId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Product' 
    },
    sku: String,
    name: String,
    quantity: { 
      type: Number, 
      required: true 
    },
    unitPrice: { 
      type: Number, 
      required: true 
    },
    subtotal: { 
      type: Number, 
      required: true 
    }
  }],
  subtotal: { 
    type: Number, 
    required: true 
  },
  iva: { 
    type: Number, 
    required: true 
  },
  ivaRate: { 
    type: Number, 
    default: 0.15 
  },
  total: { 
    type: Number, 
    required: true 
  },
  paymentMethod: { 
    type: String, 
    enum: ['Efectivo', 'Tarjeta', 'Transferencia'],
    required: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  shiftId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Shift' 
  },
  status: { 
    type: String, 
    enum: ['completada', 'anulada'],
    default: 'completada' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Sale', SaleSchema);