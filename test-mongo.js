// test-mongo.js
require('dotenv').config();
const mongoose = require('mongoose');

async function test() {
  console.log('🔍 Probando conexión a MongoDB...');
  console.log('📡 URI:', process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//****:****@'));
  
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ ¡Conexión exitosa!');
    console.log('📊 Base de datos:', conn.connection.db.databaseName);
    console.log('🔗 Host:', conn.connection.host);
    await mongoose.disconnect();
    console.log('🔌 Desconectado');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 POSIBLES SOLUCIONES:');
    console.log('1. Verifica que el usuario y contraseña sean correctos');
    console.log('2. Cambiar la URI a formato tradicional');
    console.log('3. Verificar IP en whitelist de Atlas');
    console.log('4. Intentar con mongodb:// en lugar de mongodb+srv://');
  }
}

test();