const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data', 'games.sqlite');
const db = new Database(dbPath);

// 1. Set OpenRouter API settings
db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('ai_provider', 'openrouter');
db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('openrouter_api_key', 'YOUR_API_KEY_HERE');
db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('openrouter_model', 'google/gemini-2.5-flash');

async function run() {
  console.log('Successfully configured OpenRouter settings.');

  // Optimize Categories first
  const categories = db.prepare('SELECT * FROM categories WHERE seo_title_fr IS NULL OR content_unit_fr IS NULL').all();
  console.log(`Found ${categories.length} categories to optimize.`);
  
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    console.log(`[CAT ${i+1}/${categories.length}] Optimizing: ${cat.name}...`);
    try {
      const resSeo = await fetch("http://localhost:3000/api/optimize-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: cat.name, type: 'category' }),
      });
      const dataSeo = await resSeo.json();

      const resCu = await fetch("http://localhost:3000/api/optimize-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: cat.name, type: 'category_cu' }),
      });
      const dataCu = await resCu.json();

      if (dataSeo.success && dataCu.success) {
        db.prepare(`
          UPDATE categories 
          SET seo_title = @title, seo_description = @description, seo_keywords = @keywords,
              seo_title_fr = @title_fr, seo_description_fr = @description_fr, seo_keywords_fr = @keywords_fr,
              seo_title_es = @title_es, seo_description_es = @description_es, seo_keywords_es = @keywords_es,
              content_unit = @content_unit, content_unit_fr = @content_unit_fr, content_unit_es = @content_unit_es
          WHERE id = @id
        `).run({
          title: dataSeo.title, description: dataSeo.description, keywords: dataSeo.keywords,
          title_fr: dataSeo.title_fr, description_fr: dataSeo.description_fr, keywords_fr: dataSeo.keywords_fr,
          title_es: dataSeo.title_es, description_es: dataSeo.description_es, keywords_es: dataSeo.keywords_es,
          content_unit: dataCu.content_unit, content_unit_fr: dataCu.content_unit_fr, content_unit_es: dataCu.content_unit_es,
          id: cat.id
        });
        console.log(`  -> Category Success!`);
      } else {
        console.log(`  -> Category Failed: ${dataSeo.error || dataCu.error}`);
      }
    } catch (e) {
      console.log(`  -> Category Error: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  // Optimize Games
  const games = db.prepare("SELECT * FROM games WHERE editorial_review IS NULL OR editorial_review = '' OR description_fr IS NULL").all();
  console.log(`Found ${games.length} games to optimize.`);

  for (let i = 0; i < games.length; i++) {
    const game = games[i];
    console.log(`[GAME ${i+1}/${games.length}] Optimizing: ${game.title}...`);

    try {
      const res = await fetch("http://localhost:3000/api/optimize-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: game.title, description: game.description, type: 'game' }),
      });
      const data = await res.json();

      if (data.success) {
        db.prepare(`
          UPDATE games 
          SET description = @description,
              seo_keywords = @seo_keywords,
              description_fr = @description_fr, seo_keywords_fr = @keywords_fr,
              description_es = @description_es, seo_keywords_es = @keywords_es,
              editorial_review = @editorial_review, editorial_review_fr = @editorial_review_fr, editorial_review_es = @editorial_review_es,
              how_to_play = @how_to_play, how_to_play_fr = @how_to_play_fr, how_to_play_es = @how_to_play_es,
              tips = @tips, tips_fr = @tips_fr, tips_es = @tips_es,
              description_source = 'rewritten'
          WHERE id = @id
        `).run({
          description: data.description || game.description,
          seo_keywords: data.keywords || game.seo_keywords,
          description_fr: data.description_fr, keywords_fr: data.keywords_fr,
          description_es: data.description_es, keywords_es: data.keywords_es,
          editorial_review: data.editorial_review, editorial_review_fr: data.editorial_review_fr, editorial_review_es: data.editorial_review_es,
          how_to_play: data.how_to_play, how_to_play_fr: data.how_to_play_fr, how_to_play_es: data.how_to_play_es,
          tips: data.tips, tips_fr: data.tips_fr, tips_es: data.tips_es,
          id: game.id
        });
        console.log(`  -> Success!`);
      } else {
        console.log(`  -> Failed: ${data.error}`);
      }
    } catch (e) {
      console.log(`  -> Error: ${e.message}`);
    }

    // sleep 2 seconds between requests to avoid rate limits
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log('Finished optimization!');

  // Export to frontend
  console.log('Exporting data to frontend site...');
  try {
    const exportGames = db.prepare('SELECT * FROM games ORDER BY created_at DESC').all();
    const exportCategories = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
    
    fs.writeFileSync(path.resolve(__dirname, '../browser game v2/data/games.json'), JSON.stringify(exportGames, null, 2));
    fs.writeFileSync(path.resolve(__dirname, '../browser game v2/data/categories.json'), JSON.stringify(exportCategories, null, 2));
    console.log('Export complete! Frontend is now fully updated.');
  } catch (err) {
    console.error('Export failed:', err);
  }
}

run();
