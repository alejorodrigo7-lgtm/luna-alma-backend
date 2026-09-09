// seed-simple.js
require('dotenv').config();
const connectDB = require('./config/database');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function createUsers() {
  try {
    await connectDB();
    
    const salt = await bcrypt.genSalt(10);
    
    // Usuarios a crear
    const users = [
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
      },
      {
        name: 'Admin Pruebas',
        email: 'admin@lunaalma.com',
        password: await bcrypt.hash('Admin123!', salt),
        role: 'admin'
      }
    ];
    
    let created = 0;
    let skipped = 0;
    
    for (const userData of users) {
      // Verificar si el usuario ya existe
      const existing = await User.findOne({ email: userData.email });
      if (existing) {
        console.log(`⚠️ Usuario ya existe: ${userData.email}`);
        skipped++;
        continue;
      }
      
      const user = new User(userData);
      await user.save();
      console.log(`✅ Usuario creado: ${userData.name} (${userData.email}) - ${userData.role}`);
      created++;
    }
    
    console.log('\n🎉 ¡Proceso completado!');
    console.log(`📊 Creados: ${created}, Saltados: ${skipped}`);
    console.log('\n🔑 CREDENCIALES:');
    console.log('📧 soffy@lunaalma.com / Soffy123! (Vendedor)');
    console.log('📧 tefa@lunaalma.com / Tefa123! (Vendedor)');
    console.log('📧 admin@lunaalma.com / Admin123! (Administrador)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createUsers();