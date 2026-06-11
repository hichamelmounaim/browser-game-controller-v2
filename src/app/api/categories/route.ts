import { NextResponse } from 'next/server';
import { getAllCategories, insertCategory, updateCategory, deleteCategory } from '@/lib/db';

export async function GET() {
  try {
    const categories = getAllCategories();
    return NextResponse.json({ success: true, categories });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, slug, thumbnail, seo_title, seo_description, seo_keywords, content_unit } = body;
    
    if (!name || !slug) {
      return NextResponse.json({ success: false, error: 'Name and slug are required' }, { status: 400 });
    }

    const id = Math.random().toString(36).substring(2, 11);
    
    insertCategory({
      id,
      name,
      slug,
      thumbnail: thumbnail || '',
      seo_title: seo_title || '',
      seo_description: seo_description || '',
      seo_keywords: seo_keywords || '',
      content_unit: content_unit || ''
    });

    return NextResponse.json({ success: true, message: 'Category created successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Category ID is required' }, { status: 400 });
    }

    updateCategory(body);
    return NextResponse.json({ success: true, message: 'Category updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Category ID is required' }, { status: 400 });
    }

    deleteCategory(id);
    return NextResponse.json({ success: true, message: 'Category deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
