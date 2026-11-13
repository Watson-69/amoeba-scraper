import type mysql from 'mysql2/promise';
import { execute, transaction } from './db';

export interface TorrentInput {
  id: string;
  title: string;
  size_bytes?: number | null;
  seeders?: number;
  leechers?: number;
  uploaded_at?: Date | string | null;
  category?: string | null;
  source_site: string;
  source_url?: string | null;
  magnet_link?: string | null;
  info_hash?: string | null;
  description?: string | null;
  poster_url?: string | null;
  genres?: string[] | null;
  year?: number | null;
  rating?: number | null;
  details?: string | null;
}

export interface ScrapeResult {
  source: string;
  torrents: TorrentInput[];
  errors: string[];
  warnings?: string[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function makeTorrentId(source: string, infoHash?: string | null, title?: string): string {
  const base = infoHash ?? title ?? '';
  return `${source}:${Buffer.from(base).toString('base64url').slice(0, 48)}`;
}

export interface ScraperOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  onRetry?: (attempt: number, maxRetries: number, delay: number, error: Error) => void;
}

export async function scrapeWithRetry(
  sourceName: string,
  scrapeFn: () => Promise<TorrentInput[]>,
  options: ScraperOptions = {}
): Promise<ScrapeResult> {
  const { maxRetries = 3, baseDelayMs = 2000, onRetry } = options;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const torrents = await scrapeFn();
      return { source: sourceName, torrents, errors: [] };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const msg = lastError.message.toLowerCase();

      const isBlocked = msg.includes('blocked') || msg.includes('rate limit') || msg.includes('429') || msg.includes('captcha');
      const isTimeout = msg.includes('timeout') || msg.includes('econnreset') || msg.includes('etimedout');

      if (isBlocked) {
        console.warn(`[scraper:${sourceName}] Blocked/rate-limited on attempt ${attempt}/${maxRetries}`);
      } else if (isTimeout) {
        console.warn(`[scraper:${sourceName}] Network timeout on attempt ${attempt}/${maxRetries}`);
      } else {
        console.warn(`[scraper:${sourceName}] Error on attempt ${attempt}/${maxRetries}:`, lastError.message);
      }

      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        console.log(`[scraper:${sourceName}] Retrying in ${delay}ms...`);
        if (onRetry) onRetry(attempt, maxRetries, delay, lastError);
        await sleep(delay);
      }
    }
  }

  return { source: sourceName, torrents: [], errors: [lastError?.message ?? 'Unknown error'] };
}

function toDateTime(val?: Date | string | null): string | null {
  if (!val) return null;
  const d = val instanceof Date ? val : new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

export async function upsertTorrents(torrents: TorrentInput[]): Promise<{ inserted: number; updated: number }> {
  if (torrents.length === 0) return { inserted: 0, updated: 0 };

  return transaction(async (conn) => {
    let inserted = 0;
    let updated = 0;

    for (const t of torrents) {
      const [result] = await conn.execute(
        `INSERT INTO torrents
          (id, title, size_bytes, seeders, leechers, uploaded_at, category, source_site, source_url, magnet_link, info_hash, description, poster_url, genres_json, year, rating, details)
         VALUES
            (:id, :title, :size_bytes, :seeders, :leechers, :uploaded_at, :category, :source_site, :source_url, :magnet_link, :info_hash, :description, :poster_url, :genres_json, :year, :rating, :details)
         ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            size_bytes = COALESCE(VALUES(size_bytes), size_bytes),
            seeders = VALUES(seeders),
            leechers = VALUES(leechers),
            uploaded_at = COALESCE(VALUES(uploaded_at), uploaded_at),
            category = COALESCE(VALUES(category), category),
            source_url = COALESCE(VALUES(source_url), source_url),
            magnet_link = COALESCE(VALUES(magnet_link), magnet_link),
            info_hash = COALESCE(VALUES(info_hash), info_hash),
            description = COALESCE(VALUES(description), description),
            poster_url = COALESCE(VALUES(poster_url), poster_url),
            genres_json = COALESCE(VALUES(genres_json), genres_json),
            year = COALESCE(VALUES(year), year),
            rating = COALESCE(VALUES(rating), rating),
            details = COALESCE(VALUES(details), details),
            last_scraped_at = CURRENT_TIMESTAMP`,
        {
          id: t.id,
          title: t.title,
          size_bytes: t.size_bytes ?? null,
          seeders: t.seeders ?? 0,
          leechers: t.leechers ?? 0,
          uploaded_at: toDateTime(t.uploaded_at),
          category: t.category ?? null,
          source_site: t.source_site,
          source_url: t.source_url ?? null,
          magnet_link: t.magnet_link ?? null,
          info_hash: t.info_hash ?? null,
          description: t.description ?? null,
          poster_url: t.poster_url ?? null,
          genres_json: t.genres ? JSON.stringify(t.genres) : null,
          year: t.year ?? null,
          rating: t.rating ?? null,
          details: t.details ?? null,
        }
      );

      const res = result as mysql.ResultSetHeader;
      if (res.affectedRows === 1 && res.insertId === 0) {
        updated++;
      } else {
        inserted++;
      }
    }

    return { inserted, updated };
  });
}

export async function logScrapeRun(
  source: string,
  status: 'success' | 'partial' | 'failed',
  itemsFound: number,
  itemsInserted: number,
  itemsUpdated: number,
  errorMessage?: string
): Promise<void> {
  await execute(
    `INSERT INTO scrape_logs (source_site, status, items_found, items_inserted, items_updated, error_message, started_at, completed_at)
     VALUES (:source, :status, :found, :inserted, :updated, :error, :started, NOW())`,
    {
      source,
      status,
      found: itemsFound,
      inserted: itemsInserted,
      updated: itemsUpdated,
      error: errorMessage ?? null,
      started: new Date(),
    }
  );
}