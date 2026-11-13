import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(sp.get('limit')) || 24));
    const category = sp.get('category')?.trim() || undefined;
    const sortBy = (sp.get('sortBy') as 'date' | 'size' | 'seeders' | 'name' | null) ?? 'date';
    const search = sp.get('q')?.trim() || undefined;

    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params: Record<string, unknown> = { limit, offset };

    if (category) {
      whereClause += ' AND category = :category';
      params.category = category;
    }

    if (search) {
      const tokens = search.toLowerCase().split(/\s+/).filter(t => t.length > 1);
      if (tokens.length > 0) {
        whereClause += ' AND (';
        tokens.forEach((token, i) => {
          const key = `token${i}`;
          params[key] = `%${token}%`;
          if (i > 0) whereClause += ' AND ';
          whereClause += `(title LIKE :${key} OR description LIKE :${key})`;
        });
        whereClause += ')';
      }
    }

    let orderBy = 'uploaded_at DESC';
    switch (sortBy) {
      case 'size':
        orderBy = 'size_bytes DESC';
        break;
      case 'seeders':
        orderBy = 'seeders DESC';
        break;
      case 'name':
        orderBy = 'title ASC';
        break;
      case 'date':
      default:
        orderBy = 'uploaded_at DESC';
    }

    const items = await query(
      `SELECT id, title, size_bytes, seeders, leechers, uploaded_at, category, source_site, magnet_link, info_hash, description, poster_url, genres_json, year, rating, details
       FROM torrents ${whereClause} ORDER BY ${orderBy} LIMIT :limit OFFSET :offset`,
      params
    );

    const totalResult = await queryOne<{ total: number }>(`SELECT COUNT(*) as total FROM torrents ${whereClause}`, params);
    const total = Number(totalResult?.total ?? 0);

    return NextResponse.json({
      ok: true,
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[games] Error:', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}