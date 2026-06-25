const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'games.sqlite');
const db = new Database(dbPath);

const games = db.prepare("SELECT * FROM games WHERE source_url LIKE '%crazygames.com%' AND category = 'Uncategorized' COLLATE NOCASE LIMIT 5").all();
console.log(JSON.stringify(games, null, 2));
