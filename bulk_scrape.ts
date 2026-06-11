import { chromium } from 'playwright';
import db, { exportToMainSite } from './src/lib/db';
import { scrapeGame } from './src/lib/scraper';

// API keys list provided by the user
const apiKeys = [
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

async function main() {
  console.log("Launching browser to find Poki games...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Go to Poki home
  await page.goto('https://poki.com/en', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  
  // Extract all game URLs on the homepage
  const gameUrls = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    return links
      .map(a => a.href)
      .filter(href => href.includes('/en/g/') && !href.includes('/en/g/catalog'));
  });
  
  const uniqueUrls = Array.from(new Set(gameUrls));
  console.log(`Found ${uniqueUrls.length} unique game URLs on Poki.`);
  
  // Scrape up to 40 games
  const limit = Math.min(uniqueUrls.length, 40);
  console.log(`Starting to scrape up to ${limit} games...`);
  
  await browser.close();
  
  // Set the keys in settings for the CMS to rotate them too
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('gemini_api_key', apiKeys.join('\n'));

  for (let i = 0; i < limit; i++) {
    const url = uniqueUrls[i];
    console.log(`\n--- [${i + 1}/${limit}] Scraping: ${url} ---`);
    try {
      // Rotate the API key used by the GoogleGenAI inside scrapeGame by injecting it
      // Let's call scrapeGame directly. The scrapeGame function loads 'gemini_api_key' from database settings.
      // Since it picks one key randomly, it rotates them natively!
      await scrapeGame(url, "Arcade");
    } catch (err) {
      console.error(`Error scraping ${url}:`, err);
    }
  }
  
  console.log("\nScrape complete! Syncing with website database...");
  await exportToMainSite();
  console.log("Synced and exported games successfully!");
}

main().catch(console.error);
