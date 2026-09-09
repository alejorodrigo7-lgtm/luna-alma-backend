const mongoose = require('mongoose');

const ShiftSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  startTime: { 
    type: Date, 
    default: Date.now 
  },
  endTime: { 
    type: Date 
  },
  status: { 
    type: String, 
    enum: ['open', 'closed'], 
    default: 'open' 
  },
  initialCash: { 
    type: Number, 
    default: 0 
  },
  finalCash: { 
    type: Number 
  },
  totalSales: { 
    type: Number, 
    default: 0 
  },
  totalCash: { 
    type: Number, 
    default: 0 
  },
  totalCard: { 
    type: Number, 
    default: 0 
  },
  totalTransfer: { 
    type: Number, 
    default: 0 
  },
  totalIva: { 
    type: Number, 
    default: 0 
  },
  saleCount: { 
    type: Number, 
    default: 0 
  },
  notes: { 
    type: String 
  }
});

module.exports = mongoose.model('Shift', ShiftSchema);