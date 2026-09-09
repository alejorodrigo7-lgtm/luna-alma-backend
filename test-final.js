// test-final.js
require('dotenv').config();
const mongoose = require('mongoose');

async function test() {
  console.log('🔍 Probando conexión a MongoDB...');
  console.log('📡 URI:', process.env.MONGODB_URI);
  
  try {
    // Usar la URI directamente sin parámetros adicionales
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('✅ ¡Conexión exitosa!');
    console.log('📊 Base de datos:', conn.connection.db.databaseName);
    console.log('🔗 Host:', conn.connection.host);
    
    // Listar colecciones
    const collections = await conn.connection.db.listCollections().toArray();
    console.log('📁 Colecciones:', collections.map(c => c.name).join(', ') || 'ninguna');
    
    await mongoose.disconnect();
    console.log('🔌 Desconectado');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 SOLUCIONES:');
    console.log('1. Asegúrate que la base de datos "luna_alma" existe en Atlas');
    console.log('2. Crea la base de datos con: Browse Collections → Add My Own Data');
    console.log('3. Ejecuta: node seed-admin.js para crear usuarios');
  }
}

test();