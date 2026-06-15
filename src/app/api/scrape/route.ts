import { NextResponse } from 'next/server';
import { scrapeGame } from '@/lib/scraper';
import { exportLocalJSON } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { url, category } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    
    await scrapeGame(url, category || 'Uncategorized');
    exportLocalJSON();
    
    return NextResponse.json({ success: true, message: 'Game scraped successfully' });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
