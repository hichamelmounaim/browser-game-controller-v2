import { NextResponse } from 'next/server';
import { getSetting, setSetting, getAllGames, getAllCategories } from '@/lib/db';
import * as path from 'path';
import * as fs from 'fs';

export async function GET() {
  try {
    const robotsTxt = getSetting('robots_txt_content') || '';
    const games = getAllGames();
    const categories = getAllCategories();
    
    return NextResponse.json({
      success: true,
      robotsTxt,
      stats: {
        gamesCount: games.length,
        categoriesCount: categories.length,
        totalUrls: 4 + games.length + categories.length // Home, categories, new, trending
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { robotsTxt } = await req.json();
    if (robotsTxt === undefined) {
      return NextResponse.json({ success: false, error: 'robotsTxt content is required' }, { status: 400 });
    }
    
    setSetting('robots_txt_content', robotsTxt);
    return NextResponse.json({ success: true, message: 'Settings updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const robotsTxt = getSetting('robots_txt_content') || '';
    const games = getAllGames();
    const categories = getAllCategories();
    
    // Determine the host from Sitemap line in robots.txt, fallback to localhost:13000
    let host = 'http://localhost:13000';
    const sitemapLine = robotsTxt.split('\n').find(line => line.toLowerCase().startsWith('sitemap:'));
    if (sitemapLine) {
      const match = sitemapLine.match(/https?:\/\/[^\s/]+/i);
      if (match) {
        host = match[0];
      }
    }
    
    const currentDate = new Date().toISOString().split('T')[0];
    const locales = ['en', 'fr', 'es'];
    
    const makeAlternates = (pagePath: string) => {
      let lines = '';
      locales.forEach(l => {
        lines += `    <xhtml:link rel="alternate" hreflang="${l}" href="${host}/${l}${pagePath}" />\n`;
      });
      // x-default goes to English version
      lines += `    <xhtml:link rel="alternate" hreflang="x-default" href="${host}/en${pagePath}" />\n`;
      return lines;
    };

    const mainPublicDir = path.resolve(process.cwd(), '../browser game v1/public');
    const sitemapsDir = path.join(mainPublicDir, 'sitemaps');
    
    // Ensure directories exist
    if (!fs.existsSync(mainPublicDir)) {
      fs.mkdirSync(mainPublicDir, { recursive: true });
    }
    if (!fs.existsSync(sitemapsDir)) {
      fs.mkdirSync(sitemapsDir, { recursive: true });
    }

    // 1. Generate Categories & Core Pages Sitemap (sitemap-categories.xml)
    let categoriesXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    categoriesXml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;
    
    const corePages = [
      { path: '', priority: '1.0', changefreq: 'daily' },
      { path: '/categories', priority: '0.8', changefreq: 'weekly' },
      { path: '/new', priority: '0.9', changefreq: 'daily' },
      { path: '/trending', priority: '0.9', changefreq: 'daily' }
    ];
    
    corePages.forEach(p => {
      locales.forEach(l => {
        categoriesXml += `  <url>\n`;
        categoriesXml += `    <loc>${host}/${l}${p.path}</loc>\n`;
        categoriesXml += `    <lastmod>${currentDate}</lastmod>\n`;
        categoriesXml += `    <changefreq>${p.changefreq}</changefreq>\n`;
        categoriesXml += `    <priority>${p.priority}</priority>\n`;
        categoriesXml += makeAlternates(p.path);
        categoriesXml += `  </url>\n`;
      });
    });
    
    categories.forEach(c => {
      const pagePath = `/category/${c.slug}`;
      locales.forEach(l => {
        categoriesXml += `  <url>\n`;
        categoriesXml += `    <loc>${host}/${l}${pagePath}</loc>\n`;
        categoriesXml += `    <lastmod>${currentDate}</lastmod>\n`;
        categoriesXml += `    <changefreq>daily</changefreq>\n`;
        categoriesXml += `    <priority>0.8</priority>\n`;
        categoriesXml += makeAlternates(pagePath);
        categoriesXml += `  </url>\n`;
      });
    });
    categoriesXml += `</urlset>`;
    
    fs.writeFileSync(path.join(sitemapsDir, 'sitemap-categories.xml'), categoriesXml, 'utf8');

    // 2. Generate Sharded Games Sitemaps (sitemap-games-X.xml)
    const maxUrlsPerFile = 45000;
    const gameUrls: string[] = [];
    
    games.forEach(g => {
      const pagePath = `/game/${g.slug}`;
      locales.forEach(l => {
        let urlXml = `  <url>\n`;
        urlXml += `    <loc>${host}/${l}${pagePath}</loc>\n`;
        urlXml += `    <lastmod>${currentDate}</lastmod>\n`;
        urlXml += `    <changefreq>weekly</changefreq>\n`;
        urlXml += `    <priority>0.7</priority>\n`;
        urlXml += makeAlternates(pagePath);
        urlXml += `  </url>\n`;
        gameUrls.push(urlXml);
      });
    });

    const gameSitemapsCount = Math.max(1, Math.ceil(gameUrls.length / maxUrlsPerFile));
    for (let i = 0; i < gameSitemapsCount; i++) {
      const chunk = gameUrls.slice(i * maxUrlsPerFile, (i + 1) * maxUrlsPerFile);
      let shardXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      shardXml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;
      shardXml += chunk.join('');
      shardXml += `</urlset>`;
      
      fs.writeFileSync(path.join(sitemapsDir, `sitemap-games-${i + 1}.xml`), shardXml, 'utf8');
    }

    // 3. Generate Sitemap Index (sitemap.xml)
    let sitemapIndexXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    sitemapIndexXml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    sitemapIndexXml += `  <sitemap>\n`;
    sitemapIndexXml += `    <loc>${host}/sitemaps/sitemap-categories.xml</loc>\n`;
    sitemapIndexXml += `    <lastmod>${currentDate}</lastmod>\n`;
    sitemapIndexXml += `  </sitemap>\n`;
    for (let i = 0; i < gameSitemapsCount; i++) {
      sitemapIndexXml += `  <sitemap>\n`;
      sitemapIndexXml += `    <loc>${host}/sitemaps/sitemap-games-${i + 1}.xml</loc>\n`;
      sitemapIndexXml += `    <lastmod>${currentDate}</lastmod>\n`;
      sitemapIndexXml += `  </sitemap>\n`;
    }
    sitemapIndexXml += `</sitemapindex>`;
    
    const sitemapIndexPath = path.join(mainPublicDir, 'sitemap.xml');
    const robotsPath = path.join(mainPublicDir, 'robots.txt');
    
    fs.writeFileSync(sitemapIndexPath, sitemapIndexXml, 'utf8');
    fs.writeFileSync(robotsPath, robotsTxt, 'utf8');
    
    const totalUrlsCount = (games.length + categories.length + corePages.length) * locales.length;
    console.log(`Generated and synced sitemap index and sitemaps to ${mainPublicDir}`);
    
    return NextResponse.json({
      success: true,
      message: `Successfully generated sitemap index with ${gameSitemapsCount} game sitemap shard(s) hosting a total of ${totalUrlsCount} URLs (hreflang enabled).`,
      urlsCount: totalUrlsCount
    });
  } catch (error: any) {
    console.error('Failed to generate sitemap index/sub-sitemaps:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
