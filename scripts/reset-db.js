const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function resetDb() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('🧹 Limpiando tablas de datos sin tocar la estructura ni las migraciones...');
  // TRUNCATE vacía las tablas de datos y reinicia claves foráneas sin eliminar columnas ni tablas
  await client.query('TRUNCATE TABLE habitos, usuarios CASCADE;');

  console.log('👤 Creando usuario administrador inicial listo para usar...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('AdminPassword2026!', salt);

  await client.query(
    `INSERT INTO usuarios (id, nombre, email, "passwordHash", rol, "creadoEn")
     VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())`,
    ['Administrador General', 'admin@ritmoclaro.com', passwordHash, 'ADMIN'],
  );

  const countUsuarios = await client.query('SELECT COUNT(*) FROM usuarios;');
  const countHabitos = await client.query('SELECT COUNT(*) FROM habitos;');
  const migrations = await client.query('SELECT migration_name, finished_at FROM _prisma_migrations;');

  console.log('✅ Base de datos limpia y lista para utilizar:');
  console.log(`   - Usuarios en BD: ${countUsuarios.rows[0].count} (Solo admin@ritmoclaro.com)`);
  console.log(`   - Hábitos en BD: ${countHabitos.rows[0].count}`);
  console.log(`   - Historial de migraciones Prisma: ${migrations.rows.length} aplicadas (intacto)`);

  await client.end();
}

resetDb().catch(console.error);
