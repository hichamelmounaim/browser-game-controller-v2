import { NextResponse } from 'next/server';
import { getSetting } from '@/lib/db';
import { GoogleGenAI } from '@google/genai';
import {
  DEFAULT_PROMPT_CATEGORY_MANAGER,
  DEFAULT_PROMPT_CATEGORIES,
  DEFAULT_PROMPT_GAMES
} from '@/lib/constants';

export async function POST(req: Request) {
  try {
    const { title, description, type } = await req.json();
    if (!title) {
      return NextResponse.json({ error: 'Title/Name is required' }, { status: 400 });
    }

    const keysString = getSetting('gemini_api_key');
    if (!keysString) {
      return NextResponse.json({ error: 'No Gemini API keys found in Settings' }, { status: 400 });
    }

    const apiKeys = keysString
      .split(/[\n,]+/)
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (apiKeys.length === 0) {
      return NextResponse.json({ error: 'No valid Gemini API keys found' }, { status: 400 });
    }

    const randomKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];
    const ai = new GoogleGenAI({ apiKey: randomKey });
    
    if (type === 'category_cu') {
      const dbPrompt = getSetting('prompt_category_manager');
      const prompt = (dbPrompt || DEFAULT_PROMPT_CATEGORY_MANAGER).replace(/{title}/g, title);

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      let text = response.text || '';
      
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

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const text = response.text || '';
      
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
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      
      const text = response.text || '';
      
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

        const descEn = getValue('EN_DESCRIPTION', 'EN_KEYWORDS');
        const keywordsEn = getValue('EN_KEYWORDS', 'FR_DESCRIPTION');
        
        const descFr = getValue('FR_DESCRIPTION', 'FR_KEYWORDS');
        const keywordsFr = getValue('FR_KEYWORDS', 'ES_DESCRIPTION');
        
        const descEs = getValue('ES_DESCRIPTION', 'ES_KEYWORDS');
        const keywordsEs = getEndValue('ES_KEYWORDS');

        return NextResponse.json({
          success: true,
          description: descEn,
          keywords: keywordsEn,
          description_fr: descFr,
          keywords_fr: keywordsFr,
          description_es: descEs,
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
