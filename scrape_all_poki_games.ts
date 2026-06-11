import Database from 'better-sqlite3';
import { scrapeGame } from './src/lib/scraper';
import { exportToMainSite } from './src/lib/db';
import * as path from 'path';
import * as fs from 'fs';
import * as cheerio from 'cheerio';

const dbPath = path.join(__dirname, 'data', 'games.sqlite');
const statusPath = path.join(__dirname, 'data', 'scrape_all_status.json');
const db = new Database(dbPath);

function updateStatus(statusData: {
  status: 'running' | 'completed' | 'failed' | 'idle' | 'stopped';
  currentCategory: string;
  processedCategories: number;
  totalCategories: number;
  scrapedGamesCount: number;
  completedCategories: string[];
  currentAction: string;
  error?: string;
}) {
  try {
    fs.writeFileSync(statusPath, JSON.stringify(statusData, null, 2));
  } catch (e) {
    console.error("Failed to write status file:", e);
  }
}

async function main() {
  const isResume = process.argv.includes('--resume');
  console.log(`Starting autonomous Poki fetch-all process (resume = ${isResume})...`);
  
  // Find all categories in database
  const categories = db.prepare('SELECT name, slug FROM categories').all() as { name: string; slug: string }[];
  const totalCategories = categories.length;
  
  let processedCategories = 0;
  let scrapedGamesCount = 0;
  let completedCategories: string[] = [];
  
  if (isResume && fs.existsSync(statusPath)) {
    try {
      const savedStatus = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
      if (savedStatus.completedCategories) {
        completedCategories = savedStatus.completedCategories;
      }
      if (typeof savedStatus.scrapedGamesCount === 'number') {
        scrapedGamesCount = savedStatus.scrapedGamesCount;
      }
      if (typeof savedStatus.processedCategories === 'number') {
        processedCategories = savedStatus.processedCategories;
      }
      console.log(`Resuming. Already completed categories: ${completedCategories.join(', ') || 'none'}. Games scraped: ${scrapedGamesCount}`);
    } catch (e) {
      console.error("Failed to parse status file for resume:", e);
    }
  }
  
  updateStatus({
    status: 'running',
    currentCategory: 'Initializing...',
    processedCategories,
    totalCategories,
    scrapedGamesCount,
    completedCategories,
    currentAction: isResume ? 'Resuming background crawl...' : 'Starting up and fetching category list...'
  });

  for (const cat of categories) {
    if (completedCategories.includes(cat.slug)) {
      console.log(`Category "${cat.name}" (${cat.slug}) was already completed in a previous run. Skipping...`);
      continue;
    }

    console.log(`\n--------------------------------------------------`);
    console.log(`Processing Category: ${cat.name} (${cat.slug})`);
    console.log(`--------------------------------------------------`);
    
    processedCategories++;
    updateStatus({
      status: 'running',
      currentCategory: cat.name,
      processedCategories,
      totalCategories,
      scrapedGamesCount,
      completedCategories,
      currentAction: `Fetching game links for category ${cat.name}...`
    });

    const pokiSlug = cat.slug.endsWith('-games') ? cat.slug.slice(0, -6) : cat.slug;
    const catUrl = `https://poki.com/en/${pokiSlug}`;
    try {
      const response = await fetch(catUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const html = await response.text();
      const $ = cheerio.load(html);
      
      const gameUrls: string[] = [];
      const mainGridClass = 'Wz4fsOmhQR4bEYpqHqhc';
      const grids = $(`.${mainGridClass}`);
      
      if (grids.length === 0) {
        console.log("Statically defined class grid not found. Using fallback structural parser...");
        const candidateDivs: { el: any; count: number }[] = [];
        $('div').each((_, el) => {
          const gameLinks = $(el).find('a[href*="/en/g/"]');
          if (gameLinks.length > 5) {
            candidateDivs.push({
              el,
              count: gameLinks.length
            });
          }
        });
        
        candidateDivs.sort((a, b) => b.count - a.count);
        candidateDivs.forEach(candidate => {
          const isPopular = $(candidate.el).hasClass('yanfEXzbvdGsPis_ItLV');
          if (!isPopular) {
            $(candidate.el).find('a[href*="/en/g/"]').each((_, a) => {
              const href = $(a).attr('href');
              if (href && !href.includes('/en/g/catalog')) {
                gameUrls.push(href.startsWith('http') ? href : `https://poki.com${href}`);
              }
            });
          }
        });
      } else {
        grids.each((_, grid) => {
          $(grid).find('a[href*="/en/g/"]').each((_, a) => {
            const href = $(a).attr('href');
            if (href && !href.includes('/en/g/catalog')) {
              gameUrls.push(href.startsWith('http') ? href : `https://poki.com${href}`);
            }
          });
        });
      }

      const uniqueUrls = Array.from(new Set(gameUrls));
      console.log(`Found ${uniqueUrls.length} unique game URLs for category ${cat.name}.`);

      let catScrapeCount = 0;
      for (const url of uniqueUrls) {
        const urlParts = url.split('/').filter(Boolean);
        const gameSlug = urlParts[urlParts.length - 1];

        // Check if game already exists in database (avoid duplicates)
        const alreadyExists = db.prepare('SELECT id FROM games WHERE slug = ?').get(gameSlug);
        if (alreadyExists) {
          console.log(`Game with slug "${gameSlug}" already exists in DB. Skipping...`);
          continue;
        }

        console.log(`Scraping game: ${url}`);
        updateStatus({
          status: 'running',
          currentCategory: cat.name,
          processedCategories,
          totalCategories,
          scrapedGamesCount,
          completedCategories,
          currentAction: `Scraping new game: ${gameSlug}...`
        });

        try {
          await scrapeGame(url, cat.name);
          scrapedGamesCount++;
          catScrapeCount++;
          
          // Small delay between scrapes to avoid hitting limits/quota
          await new Promise(r => setTimeout(r, 3000));
        } catch (err: any) {
          console.error(`Failed to scrape game ${url}:`, err.message);
        }
      }
      
      console.log(`Finished category ${cat.name}. Scraped ${catScrapeCount} new games.`);

    } catch (e: any) {
      console.error(`Failed to load/parse category page for ${cat.name}:`, e.message);
    }

    // Mark category as completed in memory and write state to status file
    completedCategories.push(cat.slug);
    updateStatus({
      status: 'running',
      currentCategory: cat.name,
      processedCategories,
      totalCategories,
      scrapedGamesCount,
      completedCategories,
      currentAction: `Completed category ${cat.name}`
    });
  }

  console.log("\nAll categories processed! Running export to main website portal...");
  updateStatus({
    status: 'running',
    currentCategory: 'Exporting...',
    processedCategories: totalCategories,
    totalCategories,
    scrapedGamesCount,
    completedCategories,
    currentAction: 'Syncing new game catalog and categories data to website...'
  });

  await exportToMainSite();

  updateStatus({
    status: 'completed',
    currentCategory: 'Finished',
    processedCategories: totalCategories,
    totalCategories,
    scrapedGamesCount,
    completedCategories,
    currentAction: 'Autonomous scraping process completed successfully!'
  });
  
  console.log("Autonomous scraping complete!");
}

main().catch(err => {
  console.error("Fatal error in autonomous scraper:", err);
  updateStatus({
    status: 'failed',
    currentCategory: 'Error occurred',
    processedCategories: 0,
    totalCategories: 0,
    scrapedGamesCount: 0,
    completedCategories: [],
    currentAction: 'Scraper failed',
    error: err.message
  });
});
