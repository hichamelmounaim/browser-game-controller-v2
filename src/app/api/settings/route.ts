import { NextResponse } from 'next/server';
import { getSetting, setSetting } from '@/lib/db';
import { 
  DEFAULT_PROMPT_CATEGORY_MANAGER, 
  DEFAULT_PROMPT_CATEGORIES, 
  DEFAULT_PROMPT_GAMES 
} from '@/lib/constants';

export async function GET() {
  try {
    const geminiKey = getSetting('gemini_api_key') || '';
    const siteName = getSetting('site_name') || 'ULTI GRAVITY';
    const siteLogo = getSetting('site_logo') || '';
    const usePokiDescription = getSetting('use_poki_description') || 'false';
    const promptCategoryManager = getSetting('prompt_category_manager') || DEFAULT_PROMPT_CATEGORY_MANAGER;
    const promptCategories = getSetting('prompt_categories') || DEFAULT_PROMPT_CATEGORIES;
    const promptGames = getSetting('prompt_games') || DEFAULT_PROMPT_GAMES;
    const googleAnalyticsId = getSetting('google_analytics_id') || '';
    const googleAdsenseId = getSetting('google_adsense_id') || '';
    const googleVerificationId = getSetting('google_verification_id') || '';
    const yandexVerificationId = getSetting('yandex_verification_id') || '';
    const bingVerificationId = getSetting('bing_verification_id') || '';

    return NextResponse.json({ 
      success: true, 
      settings: { 
        gemini_api_key: geminiKey,
        site_name: siteName,
        site_logo: siteLogo,
        use_poki_description: usePokiDescription,
        prompt_category_manager: promptCategoryManager,
        prompt_categories: promptCategories,
        prompt_games: promptGames,
        google_analytics_id: googleAnalyticsId,
        google_adsense_id: googleAdsenseId,
        google_verification_id: googleVerificationId,
        yandex_verification_id: yandexVerificationId,
        bing_verification_id: bingVerificationId
      } 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { key, value } = await req.json();
    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }
    setSetting(key, value);
    return NextResponse.json({ success: true, message: 'Setting saved' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
