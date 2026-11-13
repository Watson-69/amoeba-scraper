import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { searchTorrents } from '@/lib/search';
import { scrapeFitGirl } from '@/lib/scrapers/fitgirl';
import { upsertTorrents, logScrapeRun } from '@/lib/scraper';

type SortBy = 'date' | 'size' | 'seeders' | 'relevance';

function parseIntParam(v: string | null, fallback?: number): number | undefined {
  if (v == null || v === '') return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const q = (sp.get('q') ?? '').trim();
    const category = sp.get('category')?.trim() || undefined;
    const source = sp.get('source')?.trim() || undefined;
    const minSeeders = parseIntParam(sp.get('minSeeders'));
    const page = parseIntParam(sp.get('page'), 1);
    const limit = parseIntParam(sp.get('limit'), 24);
    const live = sp.get('live') === '1';
    const sortBy = (sp.get('sortBy') as SortBy | null) ?? 'relevance';

    let liveInfo: { attempted: boolean; found?: number; warnings?: string[]; error?: string } | undefined;
    if (live && q) {
      liveInfo = { attempted: true };
      try {
        const scraped = await scrapeFitGirl({ query: q, maxPages: 3, maxItems: 30, fetchDetails: true, delayMs: 700, timeoutMs: 15000 });
        if (scraped.torrents.length > 0) {
          await upsertTorrents(scraped.torrents);
          await logScrapeRun('amoeba', scraped.warnings.length ? 'partial' : 'success', scraped.torrents.length, scraped.torrents.length, 0, scraped.warnings.join('; ') || undefined);
        } else {
          await logScrapeRun('amoeba', scraped.warnings.length ? 'partial' : 'success', 0, 0, 0, scraped.warnings.join('; ') || undefined);
        }
        liveInfo.found = scraped.torrents.length;
        liveInfo.warnings = scraped.warnings;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        liveInfo.error = msg;
        await logScrapeRun('amoeba', 'failed', 0, 0, 0, msg);
      }
    }

    const result = await searchTorrents({ q, category, source, minSeeders, page, limit, sortBy });
    return NextResponse.json({ ok: true, ...result, live: liveInfo });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}