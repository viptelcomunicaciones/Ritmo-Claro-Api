const { Client } = require('pg');
require('dotenv').config();

async function setAdmin() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query('UPDATE usuarios SET rol = $1 WHERE email = $2 RETURNING id, email, rol', ['ADMIN', 'admin@ritmoclaro.com']);
  console.log('Admin configurado:', res.rows);
  await client.end();
}
setAdmin().catch(console.error);
