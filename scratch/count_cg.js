const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'games.sqlite');
const db = new Database(dbPath);

const all = db.prepare("SELECT count(*) as count FROM games WHERE source_url LIKE '%crazygames.com%'").get();
console.log('Total CrazyGames:', all.count);
