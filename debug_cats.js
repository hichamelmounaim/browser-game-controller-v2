const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://poki.com/en/categories', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => ({
      text: a.innerText.trim(),
      href: a.href,
      class: a.className
    }));
  });
  console.log(links.filter(l => l.href.includes('category') || l.href.includes('/c/')));
  await browser.close();
})();
