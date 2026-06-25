import { getSetting } from '../src/lib/db';
import Database from 'better-sqlite3';
import { GoogleGenAI } from '@google/genai';
import path from 'path';

const dbPath = path.join(__dirname, '..', 'data', 'games.sqlite');
const db = new Database(dbPath);

const categories = [
  'ARCADE GAMES', 'Casual', 'Simulation', 'Racing', 'Puzzle', 'Action', 'Sports', 
  'Adventure', 'Shooting Games', '3D GAMES', 'Dress Up Games', 'Multiplayer Games', 
  'ANIMAL GAMES', '.io Games', 'Minecraft Games', 'AIRPLANE GAMES', 'ARCHERY GAMES', 
  'Roblox Games', 'BIKE GAMES', 'ANIME GAMES'
];

async function generateCategoriesForBatch(ai: GoogleGenAI, gamesBatch: any[]): Promise<string[]> {
  const gamesText = gamesBatch.map((g, i) => `ID ${i}: ${g.title} | Tags: ${g.seo_keywords || ''} | Desc: ${(g.description || '').substring(0, 100)}`).join('\n');
  
  const prompt = `
You are a game categorizer. Choose EXACTLY ONE category from this list for each game:
[${categories.join(', ')}]

Games:
${gamesText}

Reply with ONLY a JSON array of strings, where each string is the category name for the corresponding game, in the same order. Example: ["Action", "Puzzle", ...]
`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    const text = response.text || '';
    const match = text.match(/\[.*\]/s);
    if (match) {
      return JSON.parse(match[0]);
    }
    return gamesBatch.map(() => 'Casual');
  } catch (e) {
    console.error(`AI error:`, e);
    return gamesBatch.map(() => 'Casual');
  }
}

async function run() {
  const keysString = getSetting('gemini_api_key');
  if (!keysString) {
    console.error('No Gemini API keys found in Settings');
    return;
  }
  const apiKeys = keysString.split(/[\n,]+/).map(k => k.trim()).filter(k => k.length > 0);
  const ai = new GoogleGenAI({ apiKey: apiKeys[0] });

  const games = db.prepare("SELECT id, title, description, seo_keywords FROM games WHERE source_url LIKE '%crazygames.com%' COLLATE NOCASE").all();
  console.log(`Found ${games.length} games to categorize with AI.`);

  const updateStmt = db.prepare("UPDATE games SET category = ? WHERE id = ?");
  const batchSize = 20;

  for (let i = 0; i < games.length; i += batchSize) {
    const batch = games.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(games.length/batchSize)}...`);
    
    const assignedCats = await generateCategoriesForBatch(ai, batch);
    
    for (let j = 0; j < batch.length; j++) {
      let cat = assignedCats[j] || 'Casual';
      const validCat = categories.find(c => c.toLowerCase() === cat.toLowerCase()) || 'Casual';
      updateStmt.run(validCat, batch[j].id);
    }
    
    // Delay to avoid rate limits
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log('Finished correctly categorizing games with AI!');
}

run();
