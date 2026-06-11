import { chromium } from 'playwright';
import Database from 'better-sqlite3';
import { scrapeGame } from './src/lib/scraper';
import { exportToMainSite } from './src/lib/db';
import * as path from 'path';
import * as cheerio from 'cheerio';

const db = new Database(path.join(process.cwd(), 'data', 'games.sqlite'));

async function main() {
  const targetCount = process.argv[2] ? parseInt(process.argv[2], 10) : 5;
  console.log(`Targeting ${targetCount} games per category.`);

  console.log("Retrieving categories from database...");
  const categories = db.prepare('SELECT name, slug FROM categories').all() as { name: string; slug: string }[];
  console.log(`Found ${categories.length} categories to process.`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    console.log(`\n==================================================`);
    console.log(`Category [${i + 1}/${categories.length}]: ${cat.name} (Slug: ${cat.slug})`);
    console.log(`==================================================`);

    // Check how many games we already have in this category
    const existingCountRow = db.prepare('SELECT COUNT(*) as count FROM games WHERE category = ?').get(cat.name) as { count: number };
    const existingCount = existingCountRow?.count || 0;
    
    if (existingCount >= targetCount) {
      console.log(`Already have ${existingCount} games in category ${cat.name}. Skipping scraping for this category.`);
      continue;
    }

    const needed = targetCount - existingCount;
    console.log(`Currently have ${existingCount} games. Need to scrape ${needed} more games.`);

    const pokiSlug = cat.slug.endsWith('-games') ? cat.slug.slice(0, -6) : cat.slug;
    const catUrl = `https://poki.com/en/${pokiSlug}`;
    console.log(`Loading category page: ${catUrl}`);
    
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
      console.log(`Found ${uniqueUrls.length} unique game URLs on the category page.`);

      let scrapedCount = 0;
      for (const url of uniqueUrls) {
        if (scrapedCount >= needed) break;

        // Extract game slug to check if it's already in the database
        const urlParts = url.split('/').filter(Boolean);
        const gameSlug = urlParts[urlParts.length - 1];

        const alreadyExists = db.prepare('SELECT id FROM games WHERE slug = ?').get(gameSlug);
        if (alreadyExists) {
          console.log(`Game with slug ${gameSlug} already exists in DB. Skipping...`);
          continue;
        }

        console.log(`Scraping game [${scrapedCount + 1}/${needed}]: ${url}`);
        try {
          await scrapeGame(url, cat.name);
          scrapedCount++;
          // Wait briefly to be gentle
          await new Promise(r => setTimeout(r, 2000));
        } catch (err) {
          console.error(`Failed to scrape game ${url}:`, err);
        }
      }

    } catch (e) {
      console.error(`Failed to load category page ${catUrl}:`, e);
    }
  }

  await browser.close();

  console.log("\nAll category scraping completed! Exporting to main website portal...");
  await exportToMainSite();
  console.log("Export complete!");
}

main().catch(console.error);
