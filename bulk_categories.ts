import { chromium } from 'playwright';
import { GoogleGenAI } from '@google/genai';
import db, { exportToMainSite } from './src/lib/db';

// Load API keys from DB settings, with a hardcoded fallback
let apiKeys: string[] = [];
try {
  const keysRow = db.prepare("SELECT value FROM settings WHERE key = 'gemini_api_key'").get() as { value: string } | undefined;
  if (keysRow && keysRow.value) {
    apiKeys = keysRow.value.split('\n').map((k: string) => k.trim()).filter(Boolean);
    console.log(`Loaded ${apiKeys.length} Gemini API keys from settings.`);
  }
} catch (e) {
  console.warn("Could not read API keys from DB settings, using fallback list.");
}

if (apiKeys.length === 0) {
  apiKeys = [
    "AIzaSyDIMTQaV5OHW1nhN51WU_HCpdDHDxkmN_g",
    "AIzaSyAoazvtzNyWQ41aLtKNosBhaFx0j3FGRLc",
    "AIzaSyALVC0B6rAcvVKim55XC5q28e-1yvetOiU",
    "AIzaSyBSkWmnt6TXhZy-kLs-KvNpaSRh6Kpyd_s",
    "AIzaSyD9XOwHGXIwk-s-iUbUBGJcx8neM97DBcU",
    "AIzaSyDRfwuC8cITre4nrKZuM4inHa-jPCTB68Q",
    "AIzaSyDyhCEsQsVc73T4VB5YNejjLAiNFRhtmJA",
    "AIzaSyDPwutRq_ldq9bSSw_XUX_zFjI5COH-NK0",
    "AIzaSyCqXE9tlRuoUPy77Yq9BRnT6AO9Fk61Xsk",
    "AIzaSyBj-hj9BgKjqwmQ_NXy0K12i9LfBcYDjcs",
    "AIzaSyCS_jg_w1eF1jL-Xq_S7pxFXnoOoxCQXlo",
    "AIzaSyB4G-Q6zgmn7wSZA0G2PNVnKgPwM1Px2iA",
    "AIzaSyDUk4K9ZyoOJsG9ko_sQttbFs3Ei8beuVM",
    "AIzaSyDYehycqIt9aykSqsco0Yv_DCX7UJf3QYI",
    "AIzaSyCR8gBren3sH9bmjs3jMleIyldPJoLXouo",
    "AIzaSyDKjfC39SPq5bXda3EEpvIZGG6kdh301Bg",
    "AIzaSyCD2ITNhhWgbKivAX1LbjRRz2QwoISLsMs",
    "AIzaSyA1lLnPQlPvs8TARm7r1g0WX1oELHuHjSM",
    "AIzaSyAKwsKGyl_4_cmnFSDWCSqq_HNL67BJCCA",
    "AIzaSyDUpFQ-kE0aS-A9QaKLrw5ddTu3aKz8N5s",
    "AIzaSyDfvErxaB3bCA_qM_fE3V0YRVkxByuxgBY",
    "AIzaSyDvX4Qs52iUrRvNKpxVwpiOApY42KbngGI",
    "AIzaSyAy1d8nljgI8LBwHWVqmVkT8-WcCqExoGg",
    "AIzaSyDuk1lAoEsOdRIYWrFa1oe1XFeCZgDlb0s",
    "AIzaSyC92xxspZFQT-TEryeOi7PxnWQYDE4MRZE",
    "AIzaSyB9qnybTPpbs8SH94flzJwJ6qPjYP3gsho",
    "AIzaSyAccU53QEq-tlymObB4fHcv0IQ-ocJUzu4",
    "AIzaSyCSNFdAk82Dt_QvMQ-5vbKiOkHRrIlp8f4",
    "AIzaSyC0s15JG8aYQIdhZh8G6QnrCZrOeCukHMI",
    "AIzaSyAevn3XKuuLiirHSZPPxS9sZwJjxvkQMWc",
    "AIzaSyBpdt2dqf4bk2KvsjZtfOnRjU-msGHthpw",
    "AIzaSyBugnNzOBZ_cjtXYZXVgrUDm5ZxeNhO8fU",
    "AIzaSyCRbCEzRgA7sjrD7j8XGLNkgkLP7J6Bk1s",
    "AIzaSyCWMZXTz4VHegMizmpBRCQKpE7dprwCum8",
    "AIzaSyCd3THVsnSe9sejSk9IJFGD9gibBRtw5JE",
    "AIzaSyBGueGPVLm_76D5qAmM9ElEYmPPtko7uSs"
  ];
}

let keyIndex = 0;
function getAIInstance() {
  const key = apiKeys[keyIndex];
  keyIndex = (keyIndex + 1) % apiKeys.length;
  return new GoogleGenAI({ apiKey: key });
}

async function main() {
  console.log("Launching browser to parse Poki categories...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Go to poki home or categories to get the category listing links
  await page.goto('https://poki.com/en/categories', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(5000);
  
  // Scrape using broad selectors since Poki serves links to category pages (e.g. Action Games, Skill Games)
  const pokiCategories = await page.evaluate(() => {
    // Find all links containing class or structure representing category cards on this page
    const links = Array.from(document.querySelectorAll('a'));
    
    // Filter out only links that represent category routes
    const catLinks = links.filter(l => {
      const href = l.getAttribute('href') || '';
      return href.startsWith('/en/') && 
             !href.includes('/g/') && 
             !href.includes('/c/') && 
             href !== '/en' &&
             href !== '/en/' &&
             l.innerText.trim().length > 0;
    });

    return catLinks.map(l => {
      const img = l.querySelector('img');
      const text = l.innerText.trim();
      const href = l.getAttribute('href') || '';
      const slug = href.split('/').filter(Boolean).pop() || '';
      return {
        name: text,
        slug: slug,
        thumbnail: img ? img.src : ''
      };
    }).filter(c => c.name && c.slug);
  });
  
  console.log(`Found ${pokiCategories.length} categories on Poki.`);
  await browser.close();

  if (pokiCategories.length === 0) {
    console.log("Fallback category collection since page DOM failed to render fully. Fetching known top list...");
    // Inject top Poki categories manually if selector failed to grab them from live page
    const topCats = [
      { name: "2 Player Games", slug: "2-player", thumbnail: "" },
      { name: "Car Games", slug: "car", thumbnail: "" },
      { name: "Shooting Games", slug: "shooting", thumbnail: "" },
      { name: "Action Games", slug: "action", thumbnail: "" },
      { name: "Roblox Games", slug: "roblox", thumbnail: "" },
      { name: "Minecraft Games", slug: "minecraft", thumbnail: "" },
      { name: "Multiplayer Games", slug: "multiplayer", thumbnail: "" },
      { name: "Skill Games", slug: "skill", thumbnail: "" },
      { name: "Adventure Games", slug: "adventure", thumbnail: "" },
      { name: "Puzzle Games", slug: "puzzle", thumbnail: "" },
      { name: "Dress Up Games", slug: "dress-up", thumbnail: "" },
      { name: "Brain Games", slug: "brain", thumbnail: "" },
      { name: "Sports Games", slug: "sports", thumbnail: "" },
      { name: "Math Games", slug: "math", thumbnail: "" }
    ];
    pokiCategories.push(...topCats);
  }

  // Filter unique categories
  const seenSlugs = new Set();
  const uniqueCats = pokiCategories.filter(c => {
    if (seenSlugs.has(c.slug)) return false;
    seenSlugs.add(c.slug);
    return true;
  });

  console.log(`Processing ${uniqueCats.length} unique categories...`);

  for (let i = 0; i < uniqueCats.length; i++) {
    const cat = uniqueCats[i];
    
    // Check if category is already processed in SQLite
    const existing = db.prepare('SELECT seo_title_fr, seo_title_es FROM categories WHERE slug = ?').get(cat.slug) as { seo_title_fr?: string; seo_title_es?: string } | undefined;
    if (existing && existing.seo_title_fr && existing.seo_title_es) {
      console.log(`Category [${i + 1}/${uniqueCats.length}] ${cat.name} already processed. Skipping...`);
      continue;
    }

    console.log(`\n--- [${i + 1}/${uniqueCats.length}] Translating & generating SEO for: ${cat.name} ---`);
    
    let retries = 5;
    let success = false;
    while (retries > 0 && !success) {
      try {
        const ai = getAIInstance();
        const prompt = `You are a professional SEO copywriter translating a browser game category.
Category English Name: ${cat.name}
Slug: ${cat.slug}

Task 1: Translate the Category Name into French.
Task 2: Translate the Category Name into Spanish.
Task 3: Generate a highly optimized English SEO Page Title (max 60 chars) and Meta Description (max 160 chars).
Task 4: Generate a French SEO Page Title (max 60 chars) and Meta Description (max 160 chars) matching French search intent.
Task 5: Generate a Spanish SEO Page Title (max 60 chars) and Meta Description (max 160 chars) matching Spanish search intent.
Task 6: Generate comma-separated lists of 10 keywords for English, French, and Spanish.
Task 7: Generate a rich SEO Copywriting Unit (CU) HTML for English, French, and Spanish (containing <h3> headings, paragraphs, bullet points, and an FAQ). Do NOT use markdown code block formatting.

Output format EXACTLY:
NAME_FR:
[French category name]
NAME_ES:
[Spanish category name]
SEO_TITLE_EN:
[English title]
SEO_DESC_EN:
[English description]
SEO_KEYWORDS_EN:
[English keywords]
SEO_TITLE_FR:
[French title]
SEO_DESC_FR:
[French description]
SEO_KEYWORDS_FR:
[French keywords]
SEO_TITLE_ES:
[Spanish title]
SEO_DESC_ES:
[Spanish description]
SEO_KEYWORDS_ES:
[Spanish keywords]
CU_EN:
[English CU HTML]
CU_FR:
[French CU HTML]
CU_ES:
[Spanish CU HTML]`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        const text = response.text || '';
        
        const getValue = (key: string, nextKey: string) => {
          const regex = new RegExp(`${key}:\\s*([\\s\\S]*?)${nextKey}`);
          const match = text.match(regex);
          return match ? match[1].trim() : '';
        };

        const getEndValue = (key: string) => {
          const regex = new RegExp(`${key}:\\s*([\\s\\S]*?)$`);
          const match = text.match(regex);
          return match ? match[1].trim() : '';
        };

        const nameFr = getValue('NAME_FR', 'NAME_ES');
        const nameEs = getValue('NAME_ES', 'SEO_TITLE_EN');
        const seoTitleEn = getValue('SEO_TITLE_EN', 'SEO_DESC_EN');
        const seoDescEn = getValue('SEO_DESC_EN', 'SEO_KEYWORDS_EN');
        const seoKeywordsEn = getValue('SEO_KEYWORDS_EN', 'SEO_TITLE_FR');
        const seoTitleFr = getValue('SEO_TITLE_FR', 'SEO_DESC_FR');
        const seoDescFr = getValue('SEO_DESC_FR', 'SEO_KEYWORDS_FR');
        const seoKeywordsFr = getValue('SEO_KEYWORDS_FR', 'SEO_TITLE_ES');
        const seoTitleEs = getValue('SEO_TITLE_ES', 'SEO_DESC_ES');
        const seoDescEs = getValue('SEO_DESC_ES', 'SEO_KEYWORDS_ES');
        const seoKeywordsEs = getValue('SEO_KEYWORDS_ES', 'CU_EN');
        const cuEn = getValue('CU_EN', 'CU_FR');
        const cuFr = getValue('CU_FR', 'CU_ES');
        const cuEs = getEndValue('CU_ES');

        const id = Math.random().toString(36).substring(2, 11);
        
        db.prepare(`
          INSERT OR REPLACE INTO categories (
            id, name, slug, thumbnail, 
            seo_title, seo_title_fr, seo_title_es, 
            seo_description, seo_description_fr, seo_description_es, 
            seo_keywords, seo_keywords_fr, seo_keywords_es, 
            content_unit, content_unit_fr, content_unit_es
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          cat.name,
          cat.slug,
          cat.thumbnail || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=60',
          seoTitleEn || `${cat.name} Games - Play Free Online`,
          seoTitleFr || `Jeux de ${nameFr || cat.name} - Jouer gratuitement en ligne`,
          seoTitleEs || `Juegos de ${nameEs || cat.name} - Jugar gratis en línea`,
          seoDescEn || `Play the best free online ${cat.name.toLowerCase()} games.`,
          seoDescFr || `Jouez aux meilleurs jeux de ${nameFr?.toLowerCase() || cat.name.toLowerCase()} gratuits.`,
          seoDescEs || `Juega a los mejores juegos de ${nameEs?.toLowerCase() || cat.name.toLowerCase()} gratis.`,
          seoKeywordsEn || `${cat.name.toLowerCase()}, free games`,
          seoKeywordsFr || `${nameFr?.toLowerCase() || cat.name.toLowerCase()}, jeux gratuits`,
          seoKeywordsEs || `${nameEs?.toLowerCase() || cat.name.toLowerCase()}, juegos gratis`,
          cuEn,
          cuFr,
          cuEs
        );

        console.log(`Saved category: ${cat.name} (FR: ${nameFr}, ES: ${nameEs})`);
        success = true;
      } catch (err: any) {
        console.warn(`Error processing category ${cat.name} (Attempt ${6 - retries}/5):`, err.message || err);
        retries--;
        if (retries > 0) {
          console.log(`Rotating API key to index ${keyIndex} and sleeping 1s...`);
          await new Promise(r => setTimeout(r, 1000));
        } else {
          console.error(`Failed to process category ${cat.name} after 5 attempts.`);
        }
      }
    }
  }

  // Translate French & Spanish titles and descriptions for existing games in database
  console.log("\nTranslating and adapting existing games titles and descriptions...");
  const games = db.prepare('SELECT * FROM games').all() as any[];
  for (const game of games) {
    if (!game.description_fr || !game.description_es || !game.title_fr || !game.title_es) {
      console.log(`Translating game: ${game.title}`);
      let retries = 5;
      let success = false;
      while (retries > 0 && !success) {
        try {
          const ai = getAIInstance();
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Translate the following game details into French and Spanish. If a title is a brand name (e.g. Roblox, Minecraft, Subway Surfers, Moto X3M), keep it exactly as is. Otherwise, translate or adapt it naturally to match common gaming search intent in French and Spanish.
Game Title: ${game.title}
English Description: ${game.description}

Output EXACTLY in this format:
TITLE_FR:
[French game title/adapted title]
TITLE_ES:
[Spanish game title/adapted title]
DESC_FR:
[French description]
DESC_ES:
[Spanish description]`,
          });

          const text = response.text || '';
          
          const getValue = (key: string, nextKey: string) => {
            const regex = new RegExp(`${key}:\\s*([\\s\\S]*?)${nextKey}`);
            const match = text.match(regex);
            return match ? match[1].trim() : '';
          };

          const getEndValue = (key: string) => {
            const regex = new RegExp(`${key}:\\s*([\\s\\S]*?)$`);
            const match = text.match(regex);
            return match ? match[1].trim() : '';
          };

          const titleFr = getValue('TITLE_FR', 'TITLE_ES') || game.title;
          const titleEs = getValue('TITLE_ES', 'DESC_FR') || game.title;
          const descFr = getValue('DESC_FR', 'DESC_ES') || game.description;
          const descEs = getEndValue('DESC_ES') || game.description;

          db.prepare(`
            UPDATE games 
            SET title_fr = ?, title_es = ?, description_fr = ?, description_es = ? 
            WHERE id = ?
          `).run(titleFr, titleEs, descFr, descEs, game.id);
          
          console.log(`Saved translations for game: ${game.title} (FR Title: ${titleFr}, ES Title: ${titleEs})`);
          success = true;
        } catch (err: any) {
          console.error(`Failed translation for game ${game.title} (Attempt ${6 - retries}/5):`, err.message || err);
          retries--;
          if (retries > 0) {
            console.log(`Rotating API key to index ${keyIndex} and sleeping 1s...`);
            await new Promise(r => setTimeout(r, 1000));
          } else {
            console.error(`Failed to translate game ${game.title} after 5 attempts.`);
          }
        }
      }
    }
  }

  console.log("\nAll translations and sync complete! Exporting to main website portal...");
  await exportToMainSite();
  console.log("Success!");
}

main().catch(console.error);
