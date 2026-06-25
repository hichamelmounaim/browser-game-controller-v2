const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'games.sqlite');
const db = new Database(dbPath);

const rawData = fs.readFileSync(path.join(__dirname, 'game_embeds.json'), 'utf8');
const scrapedGames = JSON.parse(rawData);

const insertStmt = db.prepare(`
  INSERT OR IGNORE INTO games (
    id, title, slug, description, thumbnail, category, source_url, iframe_url, seo_keywords, rating, description_source
  )
  VALUES (
    @id, @title, @slug, @description, @thumbnail, @category, @source_url, @iframe_url, @seo_keywords, @rating, @description_source
  )
`);

let importedCount = 0;

// Get existing slugs to avoid conflicts
const existingSlugs = new Set(db.prepare('SELECT slug FROM games').all().map(r => r.slug));

db.transaction(() => {
  for (const game of scrapedGames) {
    // Basic cleanup of title (e.g., removing "🕹️ Play on CrazyGames")
    let cleanTitle = game.title.split('Play on')[0].replace(/[🎮🕹️🏀🏠🀄🤼🚗🏃🚙🎈🎤]/g, '').trim();
    if (!cleanTitle) cleanTitle = "Unknown Game";

    let baseSlug = cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let slug = baseSlug;
    let counter = 1;
    while (existingSlugs.has(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    existingSlugs.add(slug);

    const id = Math.random().toString(36).substring(2, 11);
    
    insertStmt.run({
      id: id,
      title: cleanTitle,
      slug: slug,
      description: game.description || '',
      thumbnail: game.image || '',
      category: 'Uncategorized',
      source_url: game.url || '',
      iframe_url: game.embed_url || '',
      seo_keywords: 'games, browser games, free online games',
      rating: 4.5,
      description_source: 'original'
    });
    importedCount++;
  }
})();

console.log(`Successfully imported ${importedCount} games into the database!`);
