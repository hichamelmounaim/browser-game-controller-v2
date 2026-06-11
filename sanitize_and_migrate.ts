import Database from 'better-sqlite3';
import * as path from 'path';
import { sanitizePokiKeywords } from './src/lib/scraper';
import { exportToMainSite } from './src/lib/db';

const categoryUnsplashMap: Record<string, string> = {
  "io-games": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=60",
  "1v1-games": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=60",
  "2-player-games": "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=600&auto=format&fit=crop&q=60",
  "3d-games": "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&auto=format&fit=crop&q=60",
  "airplane-games": "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&auto=format&fit=crop&q=60",
  "animal-games": "https://images.unsplash.com/photo-1535268647977-a403b69fc756?w=600&auto=format&fit=crop&q=60",
  "anime-games": "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=60",
  "arcade": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=60",
  "archery-games": "https://images.unsplash.com/photo-1511252033621-e3776cb7b0e1?w=600&auto=format&fit=crop&q=60",
  "action": "https://images.unsplash.com/photo-1553481187-be93c21490a9?w=600&auto=format&fit=crop&q=60",
  "adventure": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=60",
  "bike-games": "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600&auto=format&fit=crop&q=60",
  "board-games": "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=600&auto=format&fit=crop&q=60",
  "boys-games": "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=600&auto=format&fit=crop&q=60",
  "car-games": "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&auto=format&fit=crop&q=60",
  "card-games": "https://images.unsplash.com/photo-1522069212224-aa841944600c?w=600&auto=format&fit=crop&q=60",
  "clicker-games": "https://images.unsplash.com/photo-1627856013091-fed6e4e30025?w=600&auto=format&fit=crop&q=60",
  "cool-games": "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&auto=format&fit=crop&q=60",
  "casual": "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=600&auto=format&fit=crop&q=60",
  "christmas-games": "https://images.unsplash.com/photo-1544982503-9f984c14501a?w=600&auto=format&fit=crop&q=60",
  "cooking": "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600&auto=format&fit=crop&q=60",
  "dinosaur-games": "https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=600&auto=format&fit=crop&q=60",
  "dress-up-games": "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=600&auto=format&fit=crop&q=60",
  "driving-games": "https://images.unsplash.com/photo-1489824900634-8b6981d33890?w=600&auto=format&fit=crop&q=60",
  "fighting-games": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=60",
  "funny-games": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=60",
  "girls-games": "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=600&auto=format&fit=crop&q=60",
  "halloween-games": "https://images.unsplash.com/photo-1508349937151-22b68b72d5b1?w=600&auto=format&fit=crop&q=60",
  "keyboard-games": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=60",
  "minecraft-games": "https://images.unsplash.com/photo-1605901309584-818e25960a8f?w=600&auto=format&fit=crop&q=60",
  "multiplayer-games": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=60",
  "new-games": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=60",
  "popular-games": "https://images.unsplash.com/photo-1553481187-be93c21490a9?w=600&auto=format&fit=crop&q=60",
  "puzzle": "https://images.unsplash.com/photo-1518133680487-3bc4b5a2597f?w=600&auto=format&fit=crop&q=60",
  "racing": "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&auto=format&fit=crop&q=60",
  "roblox-games": "https://images.unsplash.com/photo-1592478411213-6153e4ebc07d?w=600&auto=format&fit=crop&q=60",
  "running-games": "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600&auto=format&fit=crop&q=60",
  "shark-games": "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=600&auto=format&fit=crop&q=60",
  "shooting-games": "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600&auto=format&fit=crop&q=60",
  "simulation": "https://images.unsplash.com/photo-1486572788966-cfd3df1f5b42?w=600&auto=format&fit=crop&q=60",
  "snake-games": "https://images.unsplash.com/photo-1531386151447-fd762e7a3ae8?w=600&auto=format&fit=crop&q=60",
  "soccer-games": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=60",
  "sports": "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&auto=format&fit=crop&q=60",
  "stickman-games": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=60",
  "strategy": "https://images.unsplash.com/photo-1611195974226-a6a9be9dd763?w=600&auto=format&fit=crop&q=60",
  "survival-games": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=60",
  "tractor-games": "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&auto=format&fit=crop&q=60",
  "war-games": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=60",
  "zombie-games": "https://images.unsplash.com/photo-1601513525393-836389a3ad2e?w=600&auto=format&fit=crop&q=60"
};

async function run() {
  const dbPath = path.join(process.cwd(), 'data', 'games.sqlite');
  console.log(`Connecting to SQLite database at: ${dbPath}`);
  const db = new Database(dbPath);

  // 1. Sanitize Games
  console.log("Reading games from database...");
  const games = db.prepare('SELECT * FROM games').all() as any[];
  console.log(`Found ${games.length} games. Starting sanitization...`);

  let sanitizedGamesCount = 0;
  const updateGameStmt = db.prepare(`
    UPDATE games 
    SET title = @title, 
        title_fr = @title_fr, 
        title_es = @title_es, 
        description = @description, 
        description_fr = @description_fr, 
        description_es = @description_es,
        seo_keywords = @seo_keywords,
        seo_keywords_fr = @seo_keywords_fr,
        seo_keywords_es = @seo_keywords_es
    WHERE id = @id
  `);

  for (const game of games) {
    const originalDesc = game.description || '';
    const cleanTitle = sanitizePokiKeywords(game.title);
    const cleanTitleFr = game.title_fr ? sanitizePokiKeywords(game.title_fr) : '';
    const cleanTitleEs = game.title_es ? sanitizePokiKeywords(game.title_es) : '';
    const cleanDesc = sanitizePokiKeywords(originalDesc);
    const cleanDescFr = game.description_fr ? sanitizePokiKeywords(game.description_fr) : '';
    const cleanDescEs = game.description_es ? sanitizePokiKeywords(game.description_es) : '';
    const cleanKeywords = game.seo_keywords ? sanitizePokiKeywords(game.seo_keywords) : '';
    const cleanKeywordsFr = game.seo_keywords_fr ? sanitizePokiKeywords(game.seo_keywords_fr) : '';
    const cleanKeywordsEs = game.seo_keywords_es ? sanitizePokiKeywords(game.seo_keywords_es) : '';

    if (
      cleanTitle !== game.title || 
      cleanTitleFr !== game.title_fr || 
      cleanTitleEs !== game.title_es || 
      cleanDesc !== originalDesc || 
      cleanDescFr !== game.description_fr || 
      cleanDescEs !== game.description_es ||
      cleanKeywords !== game.seo_keywords ||
      cleanKeywordsFr !== game.seo_keywords_fr ||
      cleanKeywordsEs !== game.seo_keywords_es
    ) {
      updateGameStmt.run({
        id: game.id,
        title: cleanTitle,
        title_fr: cleanTitleFr || null,
        title_es: cleanTitleEs || null,
        description: cleanDesc,
        description_fr: cleanDescFr || null,
        description_es: cleanDescEs || null,
        seo_keywords: cleanKeywords || null,
        seo_keywords_fr: cleanKeywordsFr || null,
        seo_keywords_es: cleanKeywordsEs || null
      });
      sanitizedGamesCount++;
    }
  }
  console.log(`Sanitization finished. Updated ${sanitizedGamesCount} games containing Poki references.`);

  // 2. Migrate Category Thumbnails
  console.log("Reading categories from database...");
  const categories = db.prepare('SELECT * FROM categories').all() as any[];
  console.log(`Found ${categories.length} categories. Starting thumbnail migration...`);

  let updatedCategoriesCount = 0;
  const updateCatStmt = db.prepare('UPDATE categories SET thumbnail = @thumbnail WHERE id = @id');

  for (const cat of categories) {
    const unsplashUrl = categoryUnsplashMap[cat.slug];
    if (unsplashUrl && cat.thumbnail !== unsplashUrl) {
      updateCatStmt.run({
        id: cat.id,
        thumbnail: unsplashUrl
      });
      updatedCategoriesCount++;
    }
  }
  console.log(`Category thumbnail migration finished. Updated ${updatedCategoriesCount} categories to Unsplash URLs.`);

  // 3. Export to Main Site JSONs
  console.log("Exporting updated data to main site...");
  await exportToMainSite();
  console.log("Successfully exported sanitized data to main site!");
}

run().catch(err => {
  console.error("Migration script failed:", err);
  process.exit(1);
});
