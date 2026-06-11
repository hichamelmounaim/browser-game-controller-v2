const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data', 'games.sqlite');
const db = new Database(dbPath);

db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('site_name', 'Gamecis.com');
db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('site_logo', '/logo.jpg');
console.log('Controller DB updated.');

// Also update main site settings.json immediately
const mainSettingsPath = path.resolve(__dirname, '../browser game v1/data/settings.json');
let settings = {};
try {
  settings = JSON.parse(fs.readFileSync(mainSettingsPath, 'utf8'));
} catch (e) {}

settings.site_name = 'Gamecis.com';
settings.site_logo = '/logo.jpg';

fs.writeFileSync(mainSettingsPath, JSON.stringify(settings, null, 2));
console.log('Main site settings updated.');
