const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'games.sqlite');
const db = new Database(dbPath);

const count = db.prepare('SELECT COUNT(*) as c FROM games WHERE source_url LIKE \'%crazygames.com%\'').get().c;
console.log(`CrazyGames count: ${count}`);
