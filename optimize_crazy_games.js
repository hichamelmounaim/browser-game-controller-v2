const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'games.sqlite');
const db = new Database(dbPath);

async function run() {
  const games = db.prepare('SELECT * FROM games WHERE source_url LIKE \'%crazygames.com%\' AND description_source != \'rewritten\'').all();
  console.log(`Found ${games.length} games to optimize.`);

  for (let i = 0; i < games.length; i++) {
    const game = games[i];
    console.log(`[${i+1}/${games.length}] Optimizing: ${game.title}...`);

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
              description_source = 'rewritten'
          WHERE id = @id
        `).run({
          description: data.description || game.description,
          seo_keywords: data.keywords || game.seo_keywords,
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
}

run();
