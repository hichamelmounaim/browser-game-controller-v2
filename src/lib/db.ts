import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

// Ensure the data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'games.sqlite'));

// Initialize database schema
export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      title_fr TEXT,
      title_es TEXT,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      description_fr TEXT,
      description_es TEXT,
      thumbnail TEXT,
      category TEXT,
      source_url TEXT,
      iframe_url TEXT NOT NULL,
      seo_keywords TEXT,
      seo_keywords_fr TEXT,
      seo_keywords_es TEXT,
      rating REAL DEFAULT 4.5,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      thumbnail TEXT,
      seo_title TEXT,
      seo_title_fr TEXT,
      seo_title_es TEXT,
      seo_description TEXT,
      seo_description_fr TEXT,
      seo_description_es TEXT,
      seo_keywords TEXT,
      seo_keywords_fr TEXT,
      seo_keywords_es TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default settings if missing
  try {
    const robotsTxtCheck = db.prepare('SELECT value FROM settings WHERE key = ?').get('robots_txt_content');
    if (!robotsTxtCheck) {
      db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run(
        'robots_txt_content',
        `User-agent: *\nAllow: /\n\n# Host & Sitemap\nSitemap: http://localhost:13000/sitemap.xml`
      );
    }
    const siteNameCheck = db.prepare('SELECT value FROM settings WHERE key = ?').get('site_name');
    if (!siteNameCheck) {
      db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run(
        'site_name',
        'ULTI GRAVITY'
      );
    }
    const siteLogoCheck = db.prepare('SELECT value FROM settings WHERE key = ?').get('site_logo');
    if (!siteLogoCheck) {
      db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run(
        'site_logo',
        'https://images.unsplash.com/photo-1612287230202-1bf1d85d1bdf?w=128&h=128&fit=crop&q=80'
      );
    }
    const gaCheck = db.prepare('SELECT value FROM settings WHERE key = ?').get('google_analytics_id');
    if (!gaCheck) {
      db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run(
        'google_analytics_id',
        'G-6WXT4CR2MG'
      );
    }
  } catch (err) {
    console.error('Failed to seed default settings:', err);
  }

  // Migration: Add content_unit column if it doesn't exist
  try {
    db.exec('ALTER TABLE categories ADD COLUMN content_unit TEXT;');
    console.log('Successfully added content_unit column to categories table.');
  } catch (err) {
    // Column already exists, ignore
  }

  // Migration: Add description_source column to games if it doesn't exist
  try {
    db.exec("ALTER TABLE games ADD COLUMN description_source TEXT DEFAULT 'rewritten';");
    console.log("Successfully added description_source column to games table.");
  } catch (err) {
    // Column already exists, ignore
  }

  // Migration: Add localization columns if they don't exist
  const newCols = [
    { table: 'games', col: 'title_fr', type: 'TEXT' },
    { table: 'games', col: 'title_es', type: 'TEXT' },
    { table: 'games', col: 'description_fr', type: 'TEXT' },
    { table: 'games', col: 'description_es', type: 'TEXT' },
    { table: 'games', col: 'seo_keywords_fr', type: 'TEXT' },
    { table: 'games', col: 'seo_keywords_es', type: 'TEXT' },
    { table: 'categories', col: 'content_unit_fr', type: 'TEXT' },
    { table: 'categories', col: 'content_unit_es', type: 'TEXT' },
    { table: 'categories', col: 'seo_title_fr', type: 'TEXT' },
    { table: 'categories', col: 'seo_title_es', type: 'TEXT' },
    { table: 'categories', col: 'seo_description_fr', type: 'TEXT' },
    { table: 'categories', col: 'seo_description_es', type: 'TEXT' },
    { table: 'categories', col: 'seo_keywords_fr', type: 'TEXT' },
    { table: 'categories', col: 'seo_keywords_es', type: 'TEXT' }
  ];

  for (const item of newCols) {
    try {
      db.exec(`ALTER TABLE ${item.table} ADD COLUMN ${item.col} ${item.type};`);
      console.log(`Successfully added ${item.col} column to ${item.table} table.`);
    } catch (err) {
      // Column already exists, ignore
    }
  }

  // Seed default categories if the table is empty
  const countRow = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  if (countRow.count === 0) {
    const defaultCategories = ['Action', 'Puzzle', 'Arcade', 'Racing', 'Uncategorized'];
    const stmt = db.prepare(`
      INSERT INTO categories (
        id, name, slug, thumbnail, 
        seo_title, seo_title_fr, seo_title_es, 
        seo_description, seo_description_fr, seo_description_es, 
        seo_keywords, seo_keywords_fr, seo_keywords_es, 
        content_unit, content_unit_fr, content_unit_es
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    defaultCategories.forEach((cat) => {
      const slug = cat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const id = Math.random().toString(36).substring(2, 11);
      
      const defaultCU = `<h3>Play the Best Free Online ${cat} Games</h3>
<p>Welcome to ULTI GRAVITY, the home of the best ${cat.toLowerCase()} games online! In this section, you will find a curated collection of action-packed, exciting, and challenging games that you can play directly in your web browser. No downloads or installations are required—just click and play instantly!</p>
<h3>Types of ${cat} Games</h3>
<p>From classics to modern additions, our ${cat} catalog has something for everyone. Challenge your skills, compete with other players globally, or just relax and enjoy some casual gaming fun. We update our list weekly, so make sure to check back for fresh titles!</p>
<h3>FAQ</h3>
<p><strong>Are these games free to play?</strong><br/>Yes! All games on ULTI GRAVITY are 100% free to play, with no hidden costs or fees.</p>
<p><strong>Can I play these games on my phone?</strong><br/>Absolutely. All our games are fully optimized for mobile devices, tablets, and desktop computers alike.</p>
<p><strong>Do I need to download anything?</strong><br/>No downloads or plugins are required. All games run directly inside your standard internet browser.</p>`;

      const defaultCUFr = defaultCU.replace(/Play the Best Free Online/g, 'Jouez aux meilleurs jeux en ligne gratuits')
                                   .replace(/Welcome to ULTI GRAVITY/g, 'Bienvenue sur ULTI GRAVITY')
                                   .replace(/free games, browser games/g, 'jeux gratuits, jeux par navigateur');

      const defaultCUEs = defaultCU.replace(/Play the Best Free Online/g, 'Juega a los mejores juegos en línea gratis')
                                   .replace(/Welcome to ULTI GRAVITY/g, 'Bienvenido a ULTI GRAVITY')
                                   .replace(/free games, browser games/g, 'juegos gratis, juegos de navegador');

      stmt.run(
        id,
        cat,
        slug,
        `https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=60`, // generic gaming cover
        `${cat} Games - Play Free Online | Ulti Gravity`,
        `Jeux de ${cat} - Jouer gratuitement en ligne | Ulti Gravity`,
        `Juegos de ${cat} - Jugar gratis en línea | Ulti Gravity`,
        `Play the best free online ${cat.toLowerCase()} games. No downloads required, play directly in your browser.`,
        `Jouez aux meilleurs jeux de ${cat.toLowerCase()} gratuits en ligne. Aucun téléchargement requis, jouez directement sur votre navigateur.`,
        `Juega a los mejores juegos de ${cat.toLowerCase()} gratis en línea. Sin descargas, juega directamente en tu navegador.`,
        `${cat.toLowerCase()}, free games, browser games`,
        `${cat.toLowerCase()}, jeux gratuits, jeux par navigateur`,
        `${cat.toLowerCase()}, juegos gratis, juegos de navegador`,
        defaultCU,
        defaultCUFr,
        defaultCUEs
      );
    });
  }
}

// Call init immediately when the file is loaded
initDB();

export interface Game {
  id: string;
  title: string;
  title_fr?: string;
  title_es?: string;
  slug: string;
  description: string;
  description_fr?: string;
  description_es?: string;
  thumbnail: string;
  category: string;
  source_url: string;
  iframe_url: string;
  seo_keywords: string;
  seo_keywords_fr?: string;
  seo_keywords_es?: string;
  rating: number;
  description_source?: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  thumbnail: string;
  seo_title: string;
  seo_title_fr?: string;
  seo_title_es?: string;
  seo_description: string;
  seo_description_fr?: string;
  seo_description_es?: string;
  seo_keywords: string;
  seo_keywords_fr?: string;
  seo_keywords_es?: string;
  content_unit: string;
  content_unit_fr?: string;
  content_unit_es?: string;
  created_at: string;
}

export function getAllGames(): Game[] {
  return db.prepare('SELECT * FROM games ORDER BY created_at DESC').all() as Game[];
}

export function getGameBySlug(slug: string): Game | undefined {
  return db.prepare('SELECT * FROM games WHERE slug = ?').get(slug) as Game | undefined;
}

export function insertGame(game: Omit<Game, 'created_at' | 'rating'>) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO games (
      id, title, title_fr, title_es, slug, description, description_fr, description_es,
      thumbnail, category, source_url, iframe_url, seo_keywords, seo_keywords_fr, seo_keywords_es,
      description_source
    )
    VALUES (
      @id, @title, @title_fr, @title_es, @slug, @description, @description_fr, @description_es,
      @thumbnail, @category, @source_url, @iframe_url, @seo_keywords, @seo_keywords_fr, @seo_keywords_es,
      @description_source
    )
  `);
  return stmt.run(game);
}

export function updateGame(game: Partial<Game> & { id: string }) {
  const updates: string[] = [];
  const values: any = { id: game.id };
  
  for (const [key, value] of Object.entries(game)) {
    if (key !== 'id' && key !== 'created_at') {
      updates.push(`${key} = @${key}`);
      values[key] = value;
    }
  }

  if (updates.length === 0) return null;

  const query = `UPDATE games SET ${updates.join(', ')} WHERE id = @id`;
  return db.prepare(query).run(values);
}

// Category CRUD Operations
export function getAllCategories(): Category[] {
  return db.prepare('SELECT * FROM categories ORDER BY name ASC').all() as Category[];
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return db.prepare('SELECT * FROM categories WHERE slug = ?').get(slug) as Category | undefined;
}

export function insertCategory(category: Omit<Category, 'created_at'>) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO categories (
      id, name, slug, thumbnail, 
      seo_title, seo_title_fr, seo_title_es, 
      seo_description, seo_description_fr, seo_description_es, 
      seo_keywords, seo_keywords_fr, seo_keywords_es, 
      content_unit, content_unit_fr, content_unit_es
    )
    VALUES (
      @id, @name, @slug, @thumbnail, 
      @seo_title, @seo_title_fr, @seo_title_es, 
      @seo_description, @seo_description_fr, @seo_description_es, 
      @seo_keywords, @seo_keywords_fr, @seo_keywords_es, 
      @content_unit, @content_unit_fr, @content_unit_es
    )
  `);
  return stmt.run(category);
}

export function updateCategory(category: Partial<Category> & { id: string }) {
  const updates: string[] = [];
  const values: any = { id: category.id };
  
  for (const [key, value] of Object.entries(category)) {
    if (key !== 'id' && key !== 'created_at') {
      updates.push(`${key} = @${key}`);
      values[key] = value;
    }
  }

  if (updates.length === 0) return null;

  const query = `UPDATE categories SET ${updates.join(', ')} WHERE id = @id`;
  return db.prepare(query).run(values);
}

export function deleteCategory(id: string) {
  return db.prepare('DELETE FROM categories WHERE id = ?').run(id);
}

export function getSetting(key: string): string | undefined {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value;
}

export function setSetting(key: string, value: string) {
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (@key, @value)');
  return stmt.run({ key, value });
}

export default db;

import { exec } from 'child_process';
import * as util from 'util';
const execPromise = util.promisify(exec);

export async function exportToMainSite() {
  const games = getAllGames();
  const mainDataPath = path.resolve(process.cwd(), '../browser game v2/data/games.json');
  fs.writeFileSync(mainDataPath, JSON.stringify(games, null, 2));
  console.log(`Exported ${games.length} games to main site JSON.`);

  // Export Categories
  try {
    const categories = getAllCategories();
    const categoriesPath = path.resolve(process.cwd(), '../browser game v2/data/categories.json');
    fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2));
    console.log(`Exported ${categories.length} categories to main site JSON.`);
  } catch (catErr) {
    console.error('Failed to export categories:', catErr);
  }

  // Export Settings
  try {
    const settings = {
      site_name: getSetting('site_name') || 'ULTI GRAVITY',
      site_logo: getSetting('site_logo') || '',
      google_analytics_id: getSetting('google_analytics_id') || '',
      google_adsense_id: getSetting('google_adsense_id') || '',
      google_verification_id: getSetting('google_verification_id') || '',
      yandex_verification_id: getSetting('yandex_verification_id') || '',
      bing_verification_id: getSetting('bing_verification_id') || ''
    };
    const settingsPath = path.resolve(process.cwd(), '../browser game v2/data/settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    console.log('Exported settings to main site JSON.');
  } catch (settErr) {
    console.error('Failed to export settings:', settErr);
  }

  // Trigger Git Commit and Push on the main website directory
  try {
    const mainDir = path.resolve(process.cwd(), '../browser game v2');
    console.log('Committing changes to main website repository...');
    await execPromise('git add data/games.json data/categories.json data/settings.json', { cwd: mainDir });
    await execPromise('git commit -m "Update games, categories and settings data via Controller"', { cwd: mainDir });
    try {
      await execPromise('git push', { cwd: mainDir });
      console.log('Successfully pushed to GitHub!');
    } catch (pushErr) {
      console.log('Changes committed locally. Note: Git Push failed (remote might not be set up).');
    }
  } catch (err) {
    console.error('Git automation failed:', err);
  }
}
