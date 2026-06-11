import { NextResponse } from 'next/server';
import { exportToMainSite } from '@/lib/db';

export async function POST() {
  try {
    await exportToMainSite();
    return NextResponse.json({ success: true, message: 'Published to main site and triggered Git commit' });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
