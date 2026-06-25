const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'games.sqlite');
const db = new Database(dbPath);

const count = db.prepare("SELECT count(*) as count FROM games WHERE source_url LIKE '%crazygames.com%' AND category = 'Uncategorized' COLLATE NOCASE").get().count;
console.log(`Uncategorized CrazyGames: ${count}`);

const allCats = db.prepare("SELECT DISTINCT category FROM games WHERE category != 'Uncategorized'").all();
console.log("Available categories:", allCats.map(c => c.category).join(', '));
