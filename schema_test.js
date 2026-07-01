require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function test() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const tables = ['bota_fighter_profiles', 'bantcredit_balances', 'users'];
  for (const table of tables) {
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1
    `, [table]);
    console.log(`\nTable: ${table}`);
    res.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type})`));
  }
  
  await client.end();
}
test().catch(console.error);
