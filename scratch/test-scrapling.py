from scrapling.fetchers import Fetcher

page = Fetcher.get('https://www.crazygames.com/game/basketbros')
print(page.text)
