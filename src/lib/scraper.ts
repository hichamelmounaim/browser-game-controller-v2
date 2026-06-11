import { chromium } from 'playwright';
import { insertGame, getSetting, getCategoryBySlug, insertCategory } from './db';
import { GoogleGenAI } from '@google/genai';

export function sanitizePokiKeywords(text: string): string {
  if (!text) return '';
  // Remove HTML anchor tags pointing to poki websites
  let sanitized = text.replace(/<a[^>]*href=["'][^"']*poki[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi, '$1');
  // Replace direct poki URLs
  sanitized = sanitized.replace(/https?:\/\/(www\.)?poki[a-z0-9.-]*/gi, '');
  // Remove "Developer web: poki76.com" or similar
  sanitized = sanitized.replace(/developer\s+web:\s*poki[a-z0-9.-]*/gi, '');
  sanitized = sanitized.replace(/web\s+dev\s+poki[a-z0-9.-]*/gi, '');
  sanitized = sanitized.replace(/poki\s+style/gi, 'arcade style');
  // Replace general "Poki" keyword with generic portal name
  sanitized = sanitized.replace(/\bpoki\b/gi, 'our website');
  return sanitized;
}

export async function scrapeGame(url: string, selectedCategory: string = 'Uncategorized') {
  console.log(`Starting scrape for: ${url} in category: ${selectedCategory}`);
  
  let title = '';
  let thumbnail = '';
  let description = '';
  let iframeUrl = '';
  
  const cleanText = (text: string) => sanitizePokiKeywords(text);

  let gmGame: any = null;
  const isGMUrl = url.includes('gamemonetize.com') || url.includes('gamemonetize.co');
  if (isGMUrl) {
    console.log("Detected Game Monetize URL. Attempting feed lookup to bypass Playwright...");
    try {
      const feedUrl = 'https://gamemonetize.com/feed.php?format=0';
      const res = await fetch(feedUrl);
      if (res.ok) {
        const feedGames = await res.json() as any[];
        const urlSlug = url.toLowerCase().replace(/\/$/, '').split('/').pop() || '';
        gmGame = feedGames.find(g => {
          const feedSlug = g.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          return urlSlug === feedSlug || urlSlug === g.id || url.includes(g.id) || (g.url && g.url.includes(urlSlug));
        });
        if (gmGame) {
          console.log(`Feed lookup successful! Found game: ${gmGame.title}`);
          title = cleanText(gmGame.title);
          thumbnail = gmGame.thumb || '';
          let gameDesc = gmGame.description || '';
          if (gmGame.instructions) {
            gameDesc += `\n\nHow to play:\n${gmGame.instructions}`;
          }
          description = cleanText(gameDesc);
          iframeUrl = gmGame.url;
        } else {
          console.log("Game not found in feed. Falling back to Playwright scraping.");
        }
      }
    } catch (e) {
      console.error("Feed lookup failed, falling back to Playwright:", e);
    }
  }

  if (!gmGame) {
    console.log("Launching browser for Playwright scraping...");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      locale: 'en-US',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);

      const rawTitle = await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        if (h1) return h1.innerText.trim();
        return document.title.split('-')[0].trim();
      });
      title = cleanText(rawTitle);

      thumbnail = await page.evaluate(() => {
        const ogImage = document.querySelector('meta[property="og:image"]');
        if (ogImage) return ogImage.getAttribute('content') || '';
        return '';
      });

      const rawDescription = await page.evaluate(() => {
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) return metaDesc.getAttribute('content') || '';
        const paragraphs = Array.from(document.querySelectorAll('p'));
        if (paragraphs.length > 0) {
          return paragraphs.reduce((a, b) => (a.innerText.length > b.innerText.length ? a : b)).innerText.trim();
        }
        return '';
      });
      description = cleanText(rawDescription);

      let rawIframeUrl = '';
      const isGameIframe = (src: string | null) => {
        if (!src) return false;
        const lower = src.toLowerCase();
        return !lower.includes('doubleclick') && 
               !lower.includes('google') && 
               !lower.includes('facebook') &&
               !lower.includes('amazon');
      };

      let iframes = await page.locator('iframe').all();
      let hasGameIframe = false;
      for (const iframe of iframes) {
        const src = await iframe.getAttribute('src');
        if (isGameIframe(src)) {
          hasGameIframe = true;
          break;
        }
      }

      if (!hasGameIframe) {
        const playSelectors = [
          '#play-game-tile',
          'button:has-text("Play")', 
          'button:has-text("Play Now")',
          'button:has-text("Play now")',
          '[data-testid="play-button"]',
          '.play-btn',
          '#play-btn',
          '#play-button',
          '.play-button',
          'text=/Play\\s*now/i'
        ];
        for (const selector of playSelectors) {
          try {
            const btn = page.locator(selector).first();
            if (await btn.isVisible()) {
              await btn.click();
              await page.waitForTimeout(5000);
              break;
            }
          } catch (e) {}
        }
      }

      try {
        const mainPlay = page.locator('canvas, [class*="play"], [class*="start"], [id*="play"]').first();
        if (await mainPlay.isVisible()) {
          await mainPlay.click();
          await page.waitForTimeout(3000);
        }
      } catch (e) {}

      iframes = await page.locator('iframe').all();
      for (const iframe of iframes) {
        const src = await iframe.getAttribute('src');
        if (isGameIframe(src)) {
          rawIframeUrl = src!;
          break;
        }
      }

      if (!rawIframeUrl) {
        const pageHTML = await page.content();
        const match = pageHTML.match(/iframe\s+[^>]*src="([^"]+)"/i);
        if (match && isGameIframe(match[1])) {
          rawIframeUrl = match[1];
        }
      }

      iframeUrl = rawIframeUrl;

    } catch (err) {
      console.error('Error during Playwright scraping:', err);
    } finally {
      await browser.close();
    }
  }

  if (!iframeUrl) {
    console.error('Could not extract game iframe URL.');
    return;
  }

  console.log(`Found Iframe URL: ${iframeUrl}`);

  // Generate slug from title
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const id = Date.now().toString(36) + Math.random().toString(36).substring(2);

  // AI SEO Optimization & Translations with Gemini
  let optimizedDescription = description;
  let seoKeywords = title.split(' ').join(', ').toLowerCase();
  
  let descriptionFr = '';
  let seoKeywordsFr = '';
  let descriptionEs = '';
  let seoKeywordsEs = '';
  
  let titleFr = '';
  let titleEs = '';
  
  let finalCategory = selectedCategory;
  let categoryFr = '';
  let categoryEs = '';
  
  try {
    const keysString = getSetting('gemini_api_key');
    if (keysString) {
      const apiKeys = keysString
        .split(/[\n,]+/)
        .map(k => k.trim())
        .filter(k => k.length > 0);

      if (apiKeys.length > 0) {
        const randomKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];
        console.log(`Gemini API keys found (${apiKeys.length} available). Rotating for multilingual generation...`);
        const ai = new GoogleGenAI({ apiKey: randomKey });
        const useOriginalDescription = getSetting('use_original_description') === 'true';
        let prompt = '';
        
        if (useOriginalDescription) {
          prompt = `You are an expert translator for a global gaming portal.
Game Title: ${title}
Original Description: ${description}

Task 1: Translate the original description into French (French market).
Task 2: Generate 10 high-value French SEO keywords (comma-separated).
Task 3: Translate the original description into Spanish (Spanish market).
Task 4: Generate 10 high-value Spanish SEO keywords (comma-separated).
Task 5: Determine the single most appropriate primary category for this game in English (e.g., Action, Puzzle, Arcade, Racing, Sports, Casual, Adventure, Strategy, RPG, Simulation). Also provide its French and Spanish translated name.
Task 6: Translate or adapt the Game Title into French (retaining brand names if applicable).
Task 7: Translate or adapt the Game Title into Spanish (retaining brand names if applicable).

Output EXACTLY in this format:
FR_DESCRIPTION:
[French description]
FR_KEYWORDS:
[French keywords]
ES_DESCRIPTION:
[Spanish description]
ES_KEYWORDS:
[Spanish keywords]
CATEGORY_EN:
[Category in English]
CATEGORY_FR:
[Category in French]
CATEGORY_ES:
[Category in Spanish]
TITLE_FR:
[French title]
TITLE_ES:
[Spanish title]`;
        } else {
          prompt = `You are an expert SEO copywriter for a global gaming portal.
Game Title: ${title}
Original Description: ${description}

Task 1: Rewrite the description in English to be exciting, engaging, and highly SEO optimized for browser gaming. (2-3 short paragraphs, no HTML).
Task 2: Generate 10 high-value English SEO keywords for this game (comma-separated).
Task 3: Translate/adapt the optimized description into French (French market).
Task 4: Generate 10 high-value French SEO keywords (comma-separated).
Task 5: Translate/adapt the optimized description into Spanish (Spanish market).
Task 6: Generate 10 high-value Spanish SEO keywords (comma-separated).
Task 7: Determine the single most appropriate primary category for this game in English (e.g., Action, Puzzle, Arcade, Racing, Sports, Casual, Adventure, Strategy, RPG, Simulation). Also provide its French and Spanish translated name.
Task 8: Translate or adapt the Game Title into French (retaining brand names if applicable).
Task 9: Translate or adapt the Game Title into Spanish (retaining brand names if applicable).

Output EXACTLY in this format:
EN_DESCRIPTION:
[English description]
EN_KEYWORDS:
[English keywords]
FR_DESCRIPTION:
[French description]
FR_KEYWORDS:
[French keywords]
ES_DESCRIPTION:
[Spanish description]
ES_KEYWORDS:
[Spanish keywords]
CATEGORY_EN:
[Category in English]
CATEGORY_FR:
[Category in French]
CATEGORY_ES:
[Category in Spanish]
TITLE_FR:
[French title]
TITLE_ES:
[Spanish title]`;
        }
      
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
      
        const text = response.text || '';
        if (text.includes('FR_DESCRIPTION:') && text.includes('ES_DESCRIPTION:')) {
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

          if (!useOriginalDescription) {
            optimizedDescription = cleanText(getValue('EN_DESCRIPTION', 'EN_KEYWORDS'));
            seoKeywords = getValue('EN_KEYWORDS', 'FR_DESCRIPTION');
          }
          
          descriptionFr = cleanText(getValue('FR_DESCRIPTION', 'FR_KEYWORDS'));
          seoKeywordsFr = getValue('FR_KEYWORDS', 'ES_DESCRIPTION');
          descriptionEs = cleanText(getValue('ES_DESCRIPTION', 'ES_KEYWORDS'));
          seoKeywordsEs = getValue('ES_KEYWORDS', 'CATEGORY_EN');
          
          let aiCategory = getValue('CATEGORY_EN', 'CATEGORY_FR');
          aiCategory = aiCategory.replace(/[\[\]"']/g, '').trim();
          aiCategory = aiCategory.charAt(0).toUpperCase() + aiCategory.slice(1).toLowerCase();
          if (aiCategory && aiCategory.length < 30) {
            finalCategory = aiCategory;
          }

          categoryFr = getValue('CATEGORY_FR', 'CATEGORY_ES');
          categoryEs = getValue('CATEGORY_ES', 'TITLE_FR');
          
          titleFr = cleanText(getValue('TITLE_FR', 'TITLE_ES'));
          titleEs = cleanText(getEndValue('TITLE_ES'));
          
          console.log(`AI Multilingual Optimization successful! Category: ${finalCategory} (FR: ${categoryFr}, ES: ${categoryEs}), Titles: (FR: ${titleFr}, ES: ${titleEs})`);
        }
      }
    }
  } catch (aiError) {
    console.error('AI Multilingual Optimization failed, falling back:', aiError);
  }

  // Auto-create Category if it doesn't exist
  const catSlug = finalCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const existingCategory = getCategoryBySlug(catSlug);
  if (!existingCategory) {
    const catId = Math.random().toString(36).substring(2, 11);
    
    const defaultCU = `<h3>Play the Best Free Online ${finalCategory} Games</h3>
<p>Welcome to our platform, the home of the best ${finalCategory.toLowerCase()} games online! In this section, you will find a curated collection of action-packed, exciting, and challenging games that you can play directly in your web browser. No downloads or installations are required—just click and play instantly!</p>
<h3>Types of ${finalCategory} Games</h3>
<p>From classics to modern additions, our ${finalCategory} catalog has something for everyone. Challenge your skills, compete with other players globally, or just relax and enjoy some casual gaming fun. We update our list weekly, so make sure to check back for fresh titles!</p>
<h3>FAQ</h3>
<p><strong>Are these games free to play?</strong><br/>Yes! All games here are 100% free to play, with no hidden costs or fees.</p>
<p><strong>Can I play these games on my phone?</strong><br/>Absolutely. All our games are fully optimized for mobile devices, tablets, and desktop computers alike.</p>
<p><strong>Do I need to download anything?</strong><br/>No downloads or plugins are required. All games run directly inside your standard internet browser.</p>`;

    const displayFr = categoryFr || finalCategory;
    const defaultCUFr = `<h3>Jouez aux meilleurs jeux de ${displayFr} gratuits en ligne</h3>
<p>Bienvenue sur notre plateforme, la maison des meilleurs jeux de ${displayFr.toLowerCase()} en ligne ! Dans cette section, vous trouverez une collection de jeux passionnants et stimulants auxquels vous pouvez jouer directement dans votre navigateur web. Aucun téléchargement ou installation requis — cliquez et jouez instantanément !</p>
<h3>Types de jeux de ${displayFr}</h3>
<p>Des classiques aux nouveautés modernes, notre catalogue de ${displayFr.toLowerCase()} a de quoi plaire à tout le monde. Relevez le défi, affrontez d'autres joueurs du monde entier ou détendez-vous simplement en profitant de jeux occasionnels. Nous mettons à jour notre liste chaque semaine !</p>
<h3>FAQ</h3>
<p><strong>Ces jeux sont-ils gratuits ?</strong><br/>Oui ! Tous les jeux ici sont 100% gratuits, sans coûts cachés.</p>
<p><strong>Puis-je jouer à ces jeux sur mon téléphone ?</strong><br/>Absolument. Tous nos jeux sont entièrement optimisés pour les appareils mobiles, les tablettes et les ordinateurs de bureau.</p>
<p><strong>Dois-je télécharger quelque chose ?</strong><br/>Aucun téléchargement ni plugin n'est requis. Tous les jeux fonctionnent directement dans votre navigateur web standard.</p>`;

    const displayEs = categoryEs || finalCategory;
    const defaultCUEs = `<h3>Juega a los mejores juegos de ${displayEs} gratis en línea</h3>
<p>¡Bienvenido a nuestra plataforma, el hogar de los mejores juegos de ${displayEs.toLowerCase()} en línea! En esta sección, encontrarás una colección seleccionada de juegos llenos de acción, emocionantes y desafiantes que puedes jugar directamente en tu navegador web. No se requieren descargas ni instalaciones: ¡simplemente haz clic y juega al instante!</p>
<h3>Tipos de juegos de ${displayEs}</h3>
<p>Desde clásicos hasta adiciones modernas, nuestro catálogo de ${displayEs.toLowerCase()} tiene algo para todos. Desafía tus habilidades, compite con otros jugadores a nivel mundial o simplemente relájate y disfruta de una divertida partida casual. ¡Actualizamos nuestra lista semanalmente!</p>
<h3>Preguntas Frecuentes</h3>
<p><strong>¿Estos juegos son gratuitos?</strong><br/>¡Sí! Todos los juegos aquí son 100% gratuitos, sin costes ni tarifas ocultas.</p>
<p><strong>¿Puedo jugar a estos juegos en mi teléfono?</strong><br/>Absolutamente. Todos nuestros juegos están completamente optimizados para dispositivos móviles, tabletas y ordenadores de escritorio por igual.</p>
<p><strong>¿Necesito descargar algo?</strong><br/>No se requieren descargas ni complementos. Todos los juegos se ejecutan directamente dentro de tu navegador de internet estándar.</p>`;

    insertCategory({
      id: catId,
      name: finalCategory,
      slug: catSlug,
      thumbnail: thumbnail || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=60',
      seo_title: `${finalCategory} Games - Play Free Online`,
      seo_title_fr: `Jeux de ${displayFr} - Jouer gratuitement en ligne`,
      seo_title_es: `Juegos de ${displayEs} - Jugar gratis en línea`,
      seo_description: `Play the best free online ${finalCategory.toLowerCase()} games. No downloads required, play directly in your browser.`,
      seo_description_fr: `Jouez aux meilleurs jeux de ${displayFr.toLowerCase()} gratuits en ligne. Aucun téléchargement requis, jouez directement sur votre navigateur.`,
      seo_description_es: `Juega a los mejores juegos de ${displayEs.toLowerCase()} gratis en línea. Sin descargas, juega directamente en tu navegador.`,
      seo_keywords: `${finalCategory.toLowerCase()}, free games, browser games`,
      seo_keywords_fr: `${displayFr.toLowerCase()}, jeux gratuits, jeux par navigateur`,
      seo_keywords_es: `${displayEs.toLowerCase()}, juegos gratis, juegos de navegador`,
      content_unit: defaultCU,
      content_unit_fr: defaultCUFr,
      content_unit_es: defaultCUEs
    });
    console.log(`Auto-created new category: ${finalCategory}`);
  } else {
    finalCategory = existingCategory.name;
  }

  // Save to Database with translations
  const useOriginalDescription = getSetting('use_original_description') === 'true';
  insertGame({
    id,
    title,
    title_fr: titleFr || undefined,
    title_es: titleEs || undefined,
    slug,
    description: optimizedDescription,
    description_fr: descriptionFr || undefined,
    description_es: descriptionEs || undefined,
    thumbnail,
    category: finalCategory,
    source_url: url,
    iframe_url: iframeUrl,
    seo_keywords: seoKeywords,
    seo_keywords_fr: seoKeywordsFr || undefined,
    seo_keywords_es: seoKeywordsEs || undefined,
    description_source: useOriginalDescription ? 'gamemonetize' : 'rewritten'
  });

  console.log(`Successfully saved game: ${title}`);
}
