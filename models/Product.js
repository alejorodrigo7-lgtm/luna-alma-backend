const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  sku: { 
    type: String, 
    required: true, 
    unique: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  category: { 
    type: String, 
    enum: ['Perfumes', 'Ropa', 'Decoración', 'Manualidades', 'Bazar', 'Otros'],
    required: true 
  },
  costPrice: { 
    type: Number, 
    required: true 
  },
  salePrice: { 
    type: Number, 
    required: true 
  },
  stock: { 
    type: Number, 
    required: true, 
    default: 0 
  },
  minStock: { 
    type: Number, 
    required: true, 
    default: 5 
  },
  image: { 
    type: String 
  },
  active: { 
    type: Boolean, 
    default: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Margen de ganancia (virtual)
ProductSchema.virtual('margin').get(function() {
  if (this.costPrice === 0) return 0;
  return Math.round(((this.salePrice - this.costPrice) / this.salePrice) * 100);
});

// Para que los virtuals aparezcan en JSON
ProductSchema.set('toJSON', { virtuals: true });
ProductSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', ProductSchema);