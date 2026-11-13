import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const ids = sp.get('ids')?.split(',').filter(Boolean) ?? [];
    
    if (ids.length === 0) {
      return NextResponse.json({ ok: true, items: [] });
    }

    // Limit to prevent abuse
    const limitedIds = ids.slice(0, 50);
    const placeholders = limitedIds.map((_, i) => `:id${i}`).join(',');
    
    const params: Record<string, unknown> = {};
    limitedIds.forEach((id, i) => {
      params[`id${i}`] = id;
    });

    const rows = await query<Record<string, unknown>>(
      `SELECT id, seeders, leechers FROM torrents WHERE id IN (${placeholders})`,
      params
    );

    const items = rows.map(row => ({
      id: String(row.id),
      seeders: Number(row.seeders ?? 0),
      leechers: Number(row.leechers ?? 0),
    }));

    return NextResponse.json({ ok: true, items });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}