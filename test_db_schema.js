require('dotenv').config({path:'.env.local'});
const {Client} = require('pg');
const c = new Client({connectionString:process.env.DATABASE_URL});
async function run() {
  await c.connect();
  const tables = ['user_rewards_claims', 'bota_arena_battle_records', 'pack_ownership', 'bota_tool_inventory'];
  for (let t of tables) {
    console.log(`\n--- ${t} ---`);
    const res = await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1`, [t]);
    console.log(res.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
  }
  await c.end();
}
run().catch(console.error);
run2().catch(console.error); async function run2() { await c.connect(); const res = await c.query('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = ''bota_fighter_profiles'''); console.log(res.rows.map(r => r.column_name).join(', ')); await c.end(); }
