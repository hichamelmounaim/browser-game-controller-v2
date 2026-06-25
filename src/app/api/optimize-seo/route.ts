import { NextResponse } from 'next/server';
import { getSetting } from '@/lib/db';
import { GoogleGenAI } from '@google/genai';
import {
  DEFAULT_PROMPT_CATEGORY_MANAGER,
  DEFAULT_PROMPT_CATEGORIES,
  DEFAULT_PROMPT_GAMES
} from '@/lib/constants';

async function generateAIResponse(prompt: string): Promise<string> {
  const aiProvider = getSetting('ai_provider') || 'gemini';
  
  if (aiProvider === 'openrouter') {
    const openrouterKey = getSetting('openrouter_api_key');
    const openrouterModel = getSetting('openrouter_model') || 'google/gemini-2.5-flash';
    if (!openrouterKey) throw new Error('No OpenRouter API key found');
    
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openrouterKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: openrouterModel,
        messages: [{ role: "user", content: prompt }]
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'OpenRouter API Error');
    return data.choices?.[0]?.message?.content || '';
  } else {
    const keysString = getSetting('gemini_api_key');
    if (!keysString) throw new Error('No Gemini API keys found in Settings');
    const apiKeys = keysString.split(/[\n,]+/).map(k => k.trim()).filter(k => k.length > 0);
    if (apiKeys.length === 0) throw new Error('No valid Gemini API keys found');
    const randomKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];
    const ai = new GoogleGenAI({ apiKey: randomKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || '';
  }
}

export async function POST(req: Request) {
  try {
    const { title, description, type } = await req.json();
    if (!title) {
      return NextResponse.json({ error: 'Title/Name is required' }, { status: 400 });
    }

    if (type === 'category_cu') {
      const dbPrompt = getSetting('prompt_category_manager');
      const prompt = (dbPrompt || DEFAULT_PROMPT_CATEGORY_MANAGER).replace(/{title}/g, title);

      let text = await generateAIResponse(prompt);
      
      // Check for multilingual output format
      if (text.includes('CU_EN:') && text.includes('CU_FR:') && text.includes('CU_ES:')) {
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

        const cuEn = getValue('CU_EN', 'CU_FR').replace(/^```html\s*/i, '').replace(/```\s*$/, '').trim();
        const cuFr = getValue('CU_FR', 'CU_ES').replace(/^```html\s*/i, '').replace(/```\s*$/, '').trim();
        const cuEs = getEndValue('CU_ES').replace(/^```html\s*/i, '').replace(/```\s*$/, '').trim();

        return NextResponse.json({
          success: true,
          content_unit: cuEn,
          content_unit_fr: cuFr,
          content_unit_es: cuEs
        });
      } else {
        // Clean up markdown code blocks if present
        text = text.replace(/^```html\s*/i, '').replace(/```\s*$/, '').trim();
        return NextResponse.json({
          success: true,
          content_unit: text
        });
      }
    } else if (type === 'category') {
      const dbPrompt = getSetting('prompt_categories');
      const prompt = (dbPrompt || DEFAULT_PROMPT_CATEGORIES).replace(/{title}/g, title);

      const text = await generateAIResponse(prompt);
      
      // Check for multilingual output format
      if (text.includes('SEO_TITLE_EN:') && text.includes('SEO_TITLE_FR:') && text.includes('SEO_TITLE_ES:')) {
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

        const titleEn = getValue('SEO_TITLE_EN', 'SEO_DESC_EN');
        const descEn = getValue('SEO_DESC_EN', 'SEO_KEYWORDS_EN');
        const keywordsEn = getValue('SEO_KEYWORDS_EN', 'SEO_TITLE_FR');
        
        const titleFr = getValue('SEO_TITLE_FR', 'SEO_DESC_FR');
        const descFr = getValue('SEO_DESC_FR', 'SEO_KEYWORDS_FR');
        const keywordsFr = getValue('SEO_KEYWORDS_FR', 'SEO_TITLE_ES');

        const titleEs = getValue('SEO_TITLE_ES', 'SEO_DESC_ES');
        const descEs = getValue('SEO_DESC_ES', 'SEO_KEYWORDS_ES');
        const keywordsEs = getEndValue('SEO_KEYWORDS_ES');

        return NextResponse.json({
          success: true,
          title: titleEn,
          description: descEn,
          keywords: keywordsEn,
          title_fr: titleFr,
          description_fr: descFr,
          keywords_fr: keywordsFr,
          title_es: titleEs,
          description_es: descEs,
          keywords_es: keywordsEs
        });
      } else if (text.includes('TITLE:') && text.includes('DESCRIPTION:') && text.includes('KEYWORDS:')) {
        const parts1 = text.split('DESCRIPTION:');
        const seoTitle = parts1[0].replace('TITLE:', '').trim();
        const parts2 = parts1[1].split('KEYWORDS:');
        const seoDescription = parts2[0].trim();
        const seoKeywords = parts2[1].trim();

        return NextResponse.json({
          success: true,
          title: seoTitle,
          description: seoDescription,
          keywords: seoKeywords
        });
      } else {
        return NextResponse.json({ error: 'AI returned an invalid format for category' }, { status: 500 });
      }
    } else {
      // Default: Game SEO optimization
      const dbPrompt = getSetting('prompt_games');
      const prompt = (dbPrompt || DEFAULT_PROMPT_GAMES)
        .replace(/{title}/g, title)
        .replace(/{description}/g, description || 'N/A');
      
      const text = await generateAIResponse(prompt);
      
      if (text.includes('EN_DESCRIPTION:') && text.includes('FR_DESCRIPTION:') && text.includes('ES_DESCRIPTION:')) {
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

        const developer = getValue('DEVELOPER', 'RELEASE_DATE');
        const releaseDate = getValue('RELEASE_DATE', 'SUPPORTED_DEVICES');
        const supportedDevices = getValue('SUPPORTED_DEVICES', 'EN_SHORT_DESC');

        const shortDescEn = getValue('EN_SHORT_DESC', 'EN_CONTROLS');
        const controlsEn = getValue('EN_CONTROLS', 'EN_DESCRIPTION');
        const descEn = getValue('EN_DESCRIPTION', 'EN_EDITORIAL_REVIEW');
        const editorialEn = getValue('EN_EDITORIAL_REVIEW', 'EN_HOW_TO_PLAY');
        const howToPlayEn = getValue('EN_HOW_TO_PLAY', 'EN_TIPS');
        const tipsEn = getValue('EN_TIPS', 'EN_KEYWORDS');
        const keywordsEn = getValue('EN_KEYWORDS', 'FR_SHORT_DESC');
        
        const shortDescFr = getValue('FR_SHORT_DESC', 'FR_CONTROLS');
        const controlsFr = getValue('FR_CONTROLS', 'FR_DESCRIPTION');
        const descFr = getValue('FR_DESCRIPTION', 'FR_EDITORIAL_REVIEW');
        const editorialFr = getValue('FR_EDITORIAL_REVIEW', 'FR_HOW_TO_PLAY');
        const howToPlayFr = getValue('FR_HOW_TO_PLAY', 'FR_TIPS');
        const tipsFr = getValue('FR_TIPS', 'FR_KEYWORDS');
        const keywordsFr = getValue('FR_KEYWORDS', 'ES_SHORT_DESC');
        
        const shortDescEs = getValue('ES_SHORT_DESC', 'ES_CONTROLS');
        const controlsEs = getValue('ES_CONTROLS', 'ES_DESCRIPTION');
        const descEs = getValue('ES_DESCRIPTION', 'ES_EDITORIAL_REVIEW');
        const editorialEs = getValue('ES_EDITORIAL_REVIEW', 'ES_HOW_TO_PLAY');
        const howToPlayEs = getValue('ES_HOW_TO_PLAY', 'ES_TIPS');
        const tipsEs = getValue('ES_TIPS', 'ES_KEYWORDS');
        const keywordsEs = getEndValue('ES_KEYWORDS');

        return NextResponse.json({
          success: true,
          developer: developer || 'Z & K Games',
          release_date: releaseDate || 'March 2024',
          supported_devices: supportedDevices || 'Desktop, phone and tablet',
          short_description: shortDescEn,
          controls: controlsEn,
          description: descEn,
          editorial_review: editorialEn,
          how_to_play: howToPlayEn,
          tips: tipsEn,
          keywords: keywordsEn,
          short_description_fr: shortDescFr,
          controls_fr: controlsFr,
          description_fr: descFr,
          editorial_review_fr: editorialFr,
          how_to_play_fr: howToPlayFr,
          tips_fr: tipsFr,
          keywords_fr: keywordsFr,
          short_description_es: shortDescEs,
          controls_es: controlsEs,
          description_es: descEs,
          editorial_review_es: editorialEs,
          how_to_play_es: howToPlayEs,
          tips_es: tipsEs,
          keywords_es: keywordsEs
        });
      } else if (text.includes('DESCRIPTION:') && text.includes('KEYWORDS:')) {
        const parts = text.split('KEYWORDS:');
        const optimizedDescription = parts[0].replace('DESCRIPTION:', '').trim();
        const seoKeywords = parts[1].trim();
        
        return NextResponse.json({
          success: true,
          description: optimizedDescription,
          keywords: seoKeywords
        });
      } else {
        return NextResponse.json({ error: 'AI returned an invalid format' }, { status: 500 });
      }
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
