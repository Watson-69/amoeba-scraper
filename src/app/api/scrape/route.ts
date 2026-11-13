import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { runScrape } from '@/lib/scrape-service';

const scrapeBodySchema = z.object({
  query: z.string().optional(),
  maxPages: z.number().int().positive().optional(),
  maxItems: z.number().int().positive().optional(),
  fetchDetails: z.boolean().optional(),
  fullArchive: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = scrapeBodySchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'Invalid request body', details: parsed.error.flatten() }, { status: 400 });
    }

    const { query, maxPages, maxItems, fetchDetails, fullArchive } = parsed.data;
    const result = await runScrape({ query, maxPages, maxItems, fetchDetails, fullArchive });

    return NextResponse.json({ 
      ok: true, 
      found: result.found,
      inserted: result.inserted,
      updated: result.updated,
      warnings: result.warnings,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[scrape] Error:', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { queryOne } = await import('../../../lib/db.js');
    const lastRun = await queryOne(
      `SELECT * FROM scrape_logs WHERE source_site = 'amoeba' ORDER BY started_at DESC LIMIT 1`
    );
    return NextResponse.json({ ok: true, lastRun });
  } catch {
    return NextResponse.json({ ok: false, error: 'Failed to fetch status' }, { status: 500 });
  }
}