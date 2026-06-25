const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'games.sqlite');
const db = new Database(dbPath);

const categories = [
  'ARCADE GAMES', 'Casual', 'Simulation', 'Racing', 'Puzzle', 'Action', 'Sports', 
  'Adventure', 'Shooting Games', '3D GAMES', 'Dress Up Games', 'Multiplayer Games', 
  'ANIMAL GAMES', '.io Games', 'Minecraft Games', 'AIRPLANE GAMES', 'ARCHERY GAMES', 
  'Roblox Games', 'BIKE GAMES', 'ANIME GAMES'
];

const keywordMap = {
  'Shooting Games': ['shoot', 'fps', 'gun', 'sniper', 'weapon', 'zombie'],
  '.io Games': ['.io', 'io game', 'slither'],
  'Multiplayer Games': ['multiplayer', 'mmo', 'co-op', 'pvp', 'online match'],
  'Racing': ['car', 'racing', 'drive', 'speed', 'vehicle', 'drift', 'truck'],
  'Puzzle': ['puzzle', 'match', 'brain', 'logic', 'sudoku', 'mahjong', 'quiz'],
  'Sports': ['sports', 'soccer', 'basketball', 'football', 'tennis', 'golf', 'hockey', 'goal'],
  'Dress Up Games': ['dress up', 'fashion', 'makeup', 'girl', 'doll'],
  'Minecraft Games': ['minecraft', 'block', 'crafting', 'mine', 'voxel'],
  'ANIMAL GAMES': ['animal', 'pet', 'dog', 'cat', 'horse'],
  'AIRPLANE GAMES': ['airplane', 'flight', 'fly', 'plane', 'pilot'],
  'ARCHERY GAMES': ['archery', 'bow', 'arrow'],
  'Roblox Games': ['roblox', 'obby'],
  'BIKE GAMES': ['bike', 'motorcycle', 'bmx', 'rider'],
  'ANIME GAMES': ['anime', 'manga', 'naruto', 'goku'],
  'Simulation': ['simulation', 'simulator', 'farming', 'management', 'tycoon'],
  'Adventure': ['adventure', 'explore', 'quest', 'rpg'],
  'Action': ['action', 'fight', 'combat', 'brawl', 'survival'],
  '3D GAMES': ['3d'],
  'ARCADE GAMES': ['arcade', 'retro', 'platformer', 'runner', 'dash'],
  'Casual': ['casual', 'relaxing', 'idle', 'clicker']
};

const games = db.prepare("SELECT id, title, description, seo_keywords FROM games WHERE source_url LIKE '%crazygames.com%' AND category = 'Uncategorized' COLLATE NOCASE").all();
console.log(`Found ${games.length} games to categorize.`);

let updated = 0;
const updateStmt = db.prepare("UPDATE games SET category = ? WHERE id = ?");

for (const game of games) {
  const textToSearch = `${game.title} ${game.description || ''} ${game.seo_keywords || ''}`.toLowerCase();
  
  let assignedCategory = null;
  
  // Find matching category
  for (const [cat, keywords] of Object.entries(keywordMap)) {
    for (const kw of keywords) {
      if (textToSearch.includes(kw)) {
        assignedCategory = cat;
        break;
      }
    }
    if (assignedCategory) break;
  }
  
  // Fallback to 'Casual' if no match
  if (!assignedCategory) {
    assignedCategory = 'Casual';
  }
  
  updateStmt.run(assignedCategory, game.id);
  updated++;
}

console.log(`Successfully categorized ${updated} games.`);
