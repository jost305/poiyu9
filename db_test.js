require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function test() {
  console.log('Connecting to', process.env.DATABASE_URL);
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `);
  console.log(res.rows.map(r => r.table_name));
  await client.end();
}

test().catch(console.error);
