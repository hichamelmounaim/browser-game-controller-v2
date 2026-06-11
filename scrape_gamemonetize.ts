import { insertGame, exportToMainSite } from './src/lib/db';
import * as path from 'path';
import * as fs from 'fs';

const statusPath = path.join(__dirname, 'data', 'scrape_all_status.json');

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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function mapCategory(gmCategory: string, tags: string): string {
  const gm = (gmCategory || '').toLowerCase().trim();
  const tagList = (tags || '').toLowerCase().split(',').map(t => t.trim());

  // Check tags first for specific mappings
  if (tagList.includes('car') || tagList.includes('driving') || tagList.includes('racing') || gm === 'racing') return 'Racing';
  if (tagList.includes('shooting') || tagList.includes('gun') || tagList.includes('sniper') || gm === 'shooting') return 'Shooting Games';
  if (tagList.includes('minecraft')) return 'Minecraft Games';
  if (tagList.includes('roblox')) return 'Roblox Games';
  if (tagList.includes('dress up') || tagList.includes('makeup') || tagList.includes('dress-up') || gm === 'girls' || tagList.includes('beauty')) return 'Dress Up Games';
  if (tagList.includes('animal') || tagList.includes('pet') || tagList.includes('cat') || tagList.includes('dog')) return 'ANIMAL GAMES';
  if (tagList.includes('anime')) return 'ANIME GAMES';
  if (tagList.includes('bike') || tagList.includes('bicycle') || tagList.includes('motorcycle') || tagList.includes('moto')) return 'BIKE GAMES';
  if (tagList.includes('airplane') || tagList.includes('flight') || tagList.includes('flying') || tagList.includes('plane')) return 'AIRPLANE GAMES';
  if (tagList.includes('archery') || tagList.includes('bow')) return 'ARCHERY GAMES';
  if (tagList.includes('2 player') || tagList.includes('co-op') || gm === 'multiplayer') return 'Multiplayer Games';
  if (gm === '.io' || tagList.includes('io') || tagList.includes('.io')) return '.io Games';
  if (gm === '3d' || tagList.includes('3d')) return '3D GAMES';
  if (gm === 'sports' || gm === 'soccer' || tagList.includes('sports') || tagList.includes('football') || tagList.includes('soccer')) return 'Sports';
  if (gm === 'adventure' || tagList.includes('adventure')) return 'Adventure';
  if (gm === 'action' || tagList.includes('action') || tagList.includes('fighting')) return 'Action';
  if (gm === 'puzzle' || tagList.includes('puzzle') || tagList.includes('brain') || tagList.includes('math')) return 'Puzzle';
  if (gm === 'arcade' || tagList.includes('arcade')) return 'ARCADE GAMES';
  if (gm === 'cooking' || tagList.includes('cooking') || tagList.includes('kitchen') || tagList.includes('food') || tagList.includes('restaurant')) return 'Simulation';
  if (gm === 'hypercasual' || gm === 'clicker' || tagList.includes('casual') || tagList.includes('clicker')) return 'Casual';

  // Fallbacks based on gmCategory
  switch (gm) {
    case 'action': return 'Action';
    case 'adventure': return 'Adventure';
    case 'arcade': return 'ARCADE GAMES';
    case 'puzzle': return 'Puzzle';
    case 'racing': return 'Racing';
    case 'sports':
    case 'soccer': return 'Sports';
    case 'shooting': return 'Shooting Games';
    case 'girls': return 'Dress Up Games';
    case 'boys': return 'Action';
    case 'multiplayer': return 'Multiplayer Games';
    case '3d': return '3D GAMES';
    case '.io': return '.io Games';
    case 'cooking': return 'Simulation';
    case 'hypercasual':
    case 'clicker': return 'Casual';
    default: return 'Uncategorized';
  }
}

interface GMGame {
  id: string;
  title: string;
  description: string;
  instructions: string;
  url: string;
  category: string;
  tags: string;
  thumb: string;
  width: string;
  height: string;
}

async function main() {
  console.log("Starting Game Monetize feed synchronization process...");

  updateStatus({
    status: 'running',
    currentCategory: 'All',
    processedCategories: 0,
    totalCategories: 1,
    scrapedGamesCount: 0,
    completedCategories: [],
    currentAction: 'Fetching games feed from Game Monetize...'
  });

  const feedUrl = 'https://gamemonetize.com/feed.php?format=0';
  let games: GMGame[] = [];

  try {
    const res = await fetch(feedUrl);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    games = await res.json() as GMGame[];
  } catch (err: any) {
    console.error("Failed to fetch feed:", err);
    updateStatus({
      status: 'failed',
      currentCategory: 'Error',
      processedCategories: 0,
      totalCategories: 1,
      scrapedGamesCount: 0,
      completedCategories: [],
      currentAction: 'Failed to fetch feed',
      error: err.message
    });
    process.exit(1);
  }

  console.log(`Successfully fetched feed. Found ${games.length} games.`);
  updateStatus({
    status: 'running',
    currentCategory: 'All',
    processedCategories: 0,
    totalCategories: 1,
    scrapedGamesCount: 0,
    completedCategories: [],
    currentAction: `Importing ${games.length} games into database...`
  });

  let importedCount = 0;
  const usedSlugs = new Set<string>();

  for (const gmGame of games) {
    if (!gmGame.title || !gmGame.url) {
      continue;
    }

    // Generate unique slug
    let gameSlug = slugify(gmGame.title);
    if (usedSlugs.has(gameSlug)) {
      gameSlug = `${gameSlug}-${gmGame.id}`;
    }
    usedSlugs.add(gameSlug);

    // Map category
    const mappedCategory = mapCategory(gmGame.category, gmGame.tags);

    // Map description and instructions
    let gameDescription = gmGame.description || '';
    if (gmGame.instructions) {
      gameDescription += `\n\nHow to play:\n${gmGame.instructions}`;
    }

    // Build Game object matching DB structure
    const gameData = {
      id: `gm-${gmGame.id}`,
      title: gmGame.title,
      title_fr: gmGame.title, // Fallback to English title
      title_es: gmGame.title, // Fallback to English title
      slug: gameSlug,
      description: gameDescription,
      description_fr: gameDescription, // Fallback to English description
      description_es: gameDescription, // Fallback to English description
      thumbnail: gmGame.thumb || '',
      category: mappedCategory,
      source_url: gmGame.url,
      iframe_url: gmGame.url,
      seo_keywords: gmGame.tags || '',
      seo_keywords_fr: gmGame.tags || '',
      seo_keywords_es: gmGame.tags || '',
      description_source: 'gamemonetize'
    };

    try {
      insertGame(gameData);
      importedCount++;
    } catch (err) {
      console.error(`Failed to insert game "${gmGame.title}":`, err);
    }
  }

  console.log(`Import completed. Saved ${importedCount} games to SQLite database.`);

  updateStatus({
    status: 'running',
    currentCategory: 'All',
    processedCategories: 1,
    totalCategories: 1,
    scrapedGamesCount: importedCount,
    completedCategories: ['all'],
    currentAction: 'Exporting JSON files to main web project...'
  });

  try {
    await exportToMainSite();
    console.log("Successfully exported synced data to browser game v2!");
  } catch (exportErr) {
    console.error("Failed to export data to main site:", exportErr);
  }

  updateStatus({
    status: 'completed',
    currentCategory: 'Finished',
    processedCategories: 1,
    totalCategories: 1,
    scrapedGamesCount: importedCount,
    completedCategories: ['all'],
    currentAction: `Process completed successfully! Imported ${importedCount} games.`
  });

  console.log("Game Monetize feed synchronization complete!");
}

main().catch(err => {
  console.error("Fatal error in sync script:", err);
  updateStatus({
    status: 'failed',
    currentCategory: 'Error occurred',
    processedCategories: 0,
    totalCategories: 1,
    scrapedGamesCount: 0,
    completedCategories: [],
    currentAction: 'Sync process failed',
    error: err.message
  });
  process.exit(1);
});
