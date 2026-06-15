import db from './src/lib/db';
const rows = db.prepare("SELECT slug, title FROM games WHERE slug LIKE '%rowdy%'").all();
console.log(rows);
