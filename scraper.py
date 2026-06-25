import asyncio
import csv
import json
import sys
from scrapling.fetchers import AsyncStealthySession

async def fetch_game(session, url, sem, results):
    async with sem:
        try:
            page = await session.fetch(url)
            
            iframe = page.css('iframe')
            src = iframe[0].attrib.get('src') if iframe else None
            
            title_node = page.css('meta[property="og:title"]')
            title = title_node[0].attrib.get('content') if title_node else page.css('title::text').get()
            
            desc_node = page.css('meta[property="og:description"]')
            desc = desc_node[0].attrib.get('content') if desc_node else None
            
            img_node = page.css('meta[property="og:image"]')
            img = img_node[0].attrib.get('content') if img_node else None
            
            results.append({
                'url': url,
                'embed_url': src,
                'title': title,
                'description': desc,
                'image': img
            })
            print(f"[SUCCESS] {url}")
        except Exception as e:
            print(f"[ERROR] Failed to fetch {url}: {e}")
            results.append({
                'url': url,
                'embed_url': None,
                'title': None,
                'description': None,
                'image': None,
                'error': str(e)
            })

async def main():
    # Change terminal output encoding to utf-8 if on Windows
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding='utf-8')

    urls = []
    with open('game links - Sheet1.csv', 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            url = line.strip()
            if '/game/' in url:
                urls.append(url)
    
    print(f"Total game URLs to scrape: {len(urls)}")
    
    sem = asyncio.Semaphore(10)
    results = []

    async with AsyncStealthySession(headless=True) as session:
        tasks = [fetch_game(session, url, sem, results) for url in urls]
        await asyncio.gather(*tasks)

    with open('game_embeds.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=4, ensure_ascii=False)
        
    print("Scraping completed. Results saved to game_embeds.json")

if __name__ == '__main__':
    asyncio.run(main())
