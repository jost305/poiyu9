require('dotenv').config({path:'.env.local'});
const {Client} = require('pg');
const c = new Client({connectionString:process.env.DATABASE_URL});
c.connect().then(()=>c.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")).then(res=>{
    console.log(res.rows.map(r=>r.table_name).join(', '));
    c.end();
});
