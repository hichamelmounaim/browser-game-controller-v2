import { NextResponse } from 'next/server';
import { getAllGames, updateGame, deleteGame, exportLocalJSON } from '@/lib/db';

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
    exportLocalJSON();
    return NextResponse.json({ success: true, message: 'Game updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Game ID is required' }, { status: 400 });
    }
    deleteGame(id);
    exportLocalJSON();
    return NextResponse.json({ success: true, message: 'Game deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
