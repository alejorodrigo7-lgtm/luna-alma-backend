// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Conectar a MongoDB
connectDB();

// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
// Rutas del sistema de gestión
app.use('/api/sales', require('./routes/sales'));
app.use('/api/shifts', require('./routes/shifts'));
app.use('/api/history', require('./routes/history'));
// Ruta temporal para crear usuarios (SOLO PARA PRUEBAS)
app.post('/api/setup/create-users', async (req, res) => {
  try {
    const User = require('./models/User');
    const bcrypt = require('bcryptjs');
    
    const salt = await bcrypt.genSalt(10);
    
    const users = [
      {
        name: 'Admin Pruebas',
        email: 'admin@lunaalma.com',
        password: await bcrypt.hash('Admin123!', salt),
        role: 'admin'
      },
      {
        name: 'Soffy',
        email: 'soffy@lunaalma.com',
        password: await bcrypt.hash('Soffy123!', salt),
        role: 'vendedor'
      },
      {
        name: 'Tefa',
        email: 'tefa@lunaalma.com',
        password: await bcrypt.hash('Tefa123!', salt),
        role: 'vendedor'
      }
    ];
    
    let creados = 0;
    let existentes = 0;
    
    for (const userData of users) {
      const existing = await User.findOne({ email: userData.email });
      if (existing) {
        existentes++;
        continue;
      }
      const user = new User(userData);
      await user.save();
      creados++;
    }
    
    res.json({
      success: true,
      message: 'Proceso completado',
      creados,
      existentes,
      usuarios: users.map(u => ({ email: u.email, role: u.role }))
    });
  } catch (error) {
    console.error('Error al crear usuarios:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al crear usuarios',
      error: error.message 
    });
  }
});

// Ruta raíz (para evitar error 404)
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🌙 Luna & Alma API',
    version: '1.0.0',
    status: '✅ Servidor funcionando correctamente',
    endpoints: {
      test: '/api/test',
      auth: '/api/auth/login',
      products: '/api/products'
    }
  });
});

// Ruta de prueba
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true,
    message: '✅ API Luna & Alma funcionando',
    database: 'MongoDB Atlas - luna_alma'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📊 Base de datos: luna_alma`);
});