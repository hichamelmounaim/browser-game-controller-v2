const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://poki.com/en/g/subway-surfers', { waitUntil: 'domcontentloaded' });
  const tags = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a'));
    return anchors
      .map(a => a.innerText.trim())
      .filter(t => t); // Just return all link texts, and we can inspect them
  });
  console.log('Categories found:', tags);
  await browser.close();
})();
