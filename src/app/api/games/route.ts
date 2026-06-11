import { NextResponse } from 'next/server';
import { getAllGames, updateGame } from '@/lib/db';

export async function GET() {
  try {
    const games = getAllGames();
    return NextResponse.json({ success: true, games });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const gameData = await req.json();
    if (!gameData.id) {
      return NextResponse.json({ error: 'Game ID is required' }, { status: 400 });
    }
    updateGame(gameData);
    return NextResponse.json({ success: true, message: 'Game updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
