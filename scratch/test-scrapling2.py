from scrapling.fetchers import StealthyFetcher

page = StealthyFetcher.fetch('https://www.crazygames.com/game/basketbros')

iframe = page.css('iframe')
src = iframe[0].attrib.get('src') if iframe else None

title_node = page.css('meta[property="og:title"]')
title = title_node[0].attrib.get('content') if title_node else page.css('title::text').get()

desc_node = page.css('meta[property="og:description"]')
desc = desc_node[0].attrib.get('content') if desc_node else None

img_node = page.css('meta[property="og:image"]')
img = img_node[0].attrib.get('content') if img_node else None

print('Embed:', src)
print('Title:', title)
print('Desc:', desc)
print('Image:', img)
