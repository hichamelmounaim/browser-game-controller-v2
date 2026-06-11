const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://poki.com/en/categories', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  const html = await page.content();
  fs.writeFileSync('poki_categories.html', html);
  console.log('HTML Dumped');
  await browser.close();
})();
