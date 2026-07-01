require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    await pool.query(`
      INSERT INTO bota_arena_battles (p1_wallet, p1_agent, status) VALUES ('0x1A2B...3C4D', 'Toxicbot', 'queued');
      INSERT INTO bota_arena_battles (p1_wallet, p1_agent, status) VALUES ('0x5E6F...7G8H', 'Crimsonbot', 'queued');
      INSERT INTO bota_arena_battles (p1_wallet, p1_agent, status) VALUES ('0x9I0J...1K2L', 'Robo Pepe', 'queued');
    `);
    console.log('Successfully seeded 3 fighters into the queue!');
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

run();
