import * as cheerio from 'cheerio';
import type { ScrapeOptions, ScrapedTorrent } from './types';
import { makeTorrentId } from '../scraper';

const BASE = 'https://fitgirl-repacks.site';
const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 GhostTorrent/0.1 (+local research cache)';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function normText(s?: string | null): string {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}

function parseWpDate(text: string): Date | null {
  const t = normText(text);
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseSizeBytes(text: string): number | null {
  const m = text.match(/(?:Original|Repack)\s*Size\s*:\s*([~\d.,]+\s*[KMGT]i?B(?:\s*\/\s*[~\d.,]+\s*[KMGT]i?B)?)/i)
    ?? text.match(/(?:Size|Download Size)\s*:\s*([~\d.,]+\s*[KMGT]i?B)/i)
    ?? text.match(/([~\d.,]+\s*[KMGT]i?B)/i);
  if (!m) return null;
  const first = m[1].split('/')[0];
  const n = first.match(/([~\d.,]+)\s*([KMGT])i?B/i);
  if (!n) return null;
  const value = Number.parseFloat(n[1].replace(/[~,]/g, ''));
  if (!Number.isFinite(value)) return null;
  const unit = n[2].toUpperCase();
  const mul = { K: 1024, M: 1024 ** 2, G: 1024 ** 3, T: 1024 ** 4 }[unit] ?? 1;
  return Math.round(value * mul);
}

function extractInfoHash(text: string): string | null {
  const m = text.match(/\b[a-fA-F0-9]{40}\b/) ?? text.match(/\b[a-fA-F0-9]{64}\b/);
  return m ? m[0].toLowerCase().slice(0, 40) : null;
}

function createBaseTorrent(item: { title: string; source_url: string; category?: string | null; description?: string | null; uploaded_at?: Date | null; size_bytes?: number | null; genres?: string[] | null; year?: number | null }): ScrapedTorrent {
  return {
    id: makeTorrentId('fitgirl', null, item.source_url),
    title: item.title,
    category: item.category ?? 'games',
    source_site: 'fitgirl',
    source_url: item.source_url,
    description: item.description ?? null,
    uploaded_at: item.uploaded_at ?? null,
    size_bytes: item.size_bytes ?? null,
    genres: item.genres ?? null,
    year: item.year ?? null,
    seeders: 0,
    leechers: 0,
  };
}

function extractMagnet($: cheerio.CheerioAPI): string | null {
  let magnet: string | null = null;
  $('a[href^="magnet:?"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href && href.startsWith('magnet:?')) {
      magnet = href;
      return false;
    }
    return undefined;
  });
  if (magnet) return magnet;
  const text = $.text();
  const m = text.match(/magnet:\?[^\s"'<>]+/i);
  return m ? m[0] : null;
}

function extractGenres(text: string): string[] {
  const m = text.match(/Genres?\s*\/?\s*Tags?\s*:\s*([^\n\r]+)/i);
  if (!m) return [];
  return m[1]
    .split(/[,+/]/)
    .map((s) => normText(s))
    .filter(Boolean)
    .slice(0, 8);
}

function extractYear(title: string): number | null {
  const m = title.match(/\b(19\d{2}|20[0-3]\d)\b/);
  if (!m) return null;
  const y = Number(m[1]);
  return y >= 1980 && y <= 2035 ? y : null;
}

async function fetchHtml(url: string, opts: ScrapeOptions): Promise<{ html: string; status: number; finalUrl: string }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), opts.timeoutMs ?? 20000);
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': opts.userAgent ?? DEFAULT_UA,
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'en-US,en;q=0.9',
      },
    });
    const html = await res.text();
    return { html, status: res.status, finalUrl: res.url || url };
  } finally {
    clearTimeout(t);
  }
}

function buildSearchUrl(query?: string, page = 1): string {
  const q = (query ?? '').trim();
  if (!q) return page > 1 ? `${BASE}/page/${page}/` : `${BASE}/`;
  const encoded = encodeURIComponent(q);
  return page > 1 ? `${BASE}/page/${page}/?s=${encoded}` : `${BASE}/?s=${encoded}`;
}

function isLikelyBlocked(html: string, status: number): boolean {
  if (status === 403 || status === 429 || status === 503) return true;
  const lower = html.toLowerCase();
  return lower.includes('just a moment') || lower.includes('cloudflare') && lower.includes('challenge') || lower.includes('captcha');
}

function parseListing(html: string, finalUrl: string): { items: Array<Partial<ScrapedTorrent> & { source_url: string; title: string }>; nextPageUrl: string | null; warnings: string[] } {
  const $ = cheerio.load(html);
  const warnings: string[] = [];
  const items: Array<Partial<ScrapedTorrent> & { source_url: string; title: string }> = [];
  const seen = new Set<string>();

  $('article').each((_, article) => {
    const a = $(article).find('.entry-title a, h1.entry-title a, h2.entry-title a').first();
    const title = normText(a.text());
    const href = a.attr('href');
    if (!title || !href) return;
    if (seen.has(href)) return;
    seen.add(href);

    const dateText = normText($(article).find('time.entry-date, .entry-date, time').first().text());
    const summary = normText($(article).find('.entry-summary, .entry-content').first().text());
    const cats = $(article)
      .find('.cat-links a, .category-links a, a[rel="category tag"]')
      .map((__, c) => normText($(c).text()))
      .get()
      .filter(Boolean);

    items.push({
      title,
      source_url: href,
      source_site: 'fitgirl',
      category: cats[0]?.toLowerCase().includes('lossless') || /repack/i.test(title) ? 'games' : (cats[0]?.toLowerCase() ?? 'games'),
      uploaded_at: parseWpDate(dateText),
      description: summary.slice(0, 4000) || null,
      size_bytes: parseSizeBytes(summary),
      genres: extractGenres(summary),
      year: extractYear(title),
    });
  });

  // Fallback selectors for theme variations
  if (items.length === 0) {
    $('h1.entry-title a, h2.entry-title a, .post-title a').each((_, el) => {
      const title = normText($(el).text());
      const href = $(el).attr('href');
      if (!title || !href || seen.has(href)) return;
      seen.add(href);
      items.push({ title, source_url: href, source_site: 'fitgirl', category: 'games' });
    });
    if (items.length > 0) warnings.push('Used fallback title selectors; listing structure may have changed.');
  }

  const next = $('a.next, a.next.page-numbers, .nav-links a.next, link[rel="next"]').first().attr('href') || null;
  if (items.length === 0 && !isLikelyBlocked(html, 200)) warnings.push(`No items parsed from ${finalUrl}`);
  return { items, nextPageUrl: next, warnings };
}

async function enrichFromDetail(item: Partial<ScrapedTorrent> & { source_url: string; title: string }, opts: ScrapeOptions): Promise<ScrapedTorrent> {
  let magnet: string | null = item.magnet_link ?? null;
  let infoHash: string | null = item.info_hash ?? null;
  let description = item.description ?? null;
  let sizeBytes = item.size_bytes ?? null;
  let genres = item.genres ?? [];
  let poster: string | null = item.poster_url ?? null;

  try {
    const { html, status } = await fetchHtml(item.source_url, { ...opts, timeoutMs: Math.min(opts.timeoutMs ?? 20000, 15000) });
    if (isLikelyBlocked(html, status)) throw new Error(`blocked status=${status}`);
    const $ = cheerio.load(html);
    const content = $('.entry-content, article .entry-content, .post-content').first();
    const text = normText(content.text()) || normText($.text());
    magnet = magnet ?? extractMagnet($);
    infoHash = infoHash ?? extractInfoHash(magnet ?? '') ?? extractInfoHash(text);
    sizeBytes = sizeBytes ?? parseSizeBytes(text);
    if (!genres?.length) genres = extractGenres(text);
    description = description ?? text.slice(0, 6000) ?? null;
    const img = content.find('img').first().attr('src') || $('meta[property="og:image"]').attr('content') || null;
    if (img && /^https?:\/\//i.test(img)) poster = img;
  } catch (err) {
    // Keep listing data; detail enrichment is best-effort.
    const msg = err instanceof Error ? err.message : String(err);
    if (/blocked|403|429|captcha/i.test(msg)) throw err;
  }

  const id = makeTorrentId('fitgirl', infoHash, item.source_url || item.title);
  return {
    id,
    title: item.title,
    size_bytes: sizeBytes,
    seeders: item.seeders ?? 0,
    leechers: item.leechers ?? 0,
    uploaded_at: item.uploaded_at ?? null,
    category: item.category ?? 'games',
    source_site: 'fitgirl',
    source_url: item.source_url,
    magnet_link: magnet,
    info_hash: infoHash,
    description,
    poster_url: poster,
    genres: genres ?? null,
    year: item.year ?? extractYear(item.title),
    details: description ? description.slice(0, 500) : null,
    raw_meta: null,
  };
}

/**
 * Scrape FitGirl Repacks with search and pagination.
 * - Uses WordPress search endpoint (`?s=`) and `page/N/` pagination.
 * - Parses listing articles, then optionally enriches detail pages for magnet/hash/size.
 * - Handles blocked/rate-limit responses by throwing (caller retry logic can react).
 */
export async function scrapeFitGirl(options: ScrapeOptions = {}): Promise<{ torrents: ScrapedTorrent[]; warnings: string[] }> {
  const opts: ScrapeOptions = {
    maxPages: options.query ? 5 : 2,
    maxItems: options.query ? 50 : 25,
    delayMs: 900,
    timeoutMs: 20000,
    fetchDetails: true,
    ...options,
  };

  const torrents: ScrapedTorrent[] = [];
  const warnings: string[] = [];
  const seenUrls = new Set<string>();

  for (let page = 1; page <= (opts.maxPages ?? 1); page++) {
    if (torrents.length >= (opts.maxItems ?? 50)) break;
    const url = buildSearchUrl(opts.query, page);
    const { html, status, finalUrl } = await fetchHtml(url, opts);
    if (isLikelyBlocked(html, status)) {
      throw new Error(`FitGirl blocked or challenged (status ${status}, url ${finalUrl})`);
    }

    const parsed = parseListing(html, finalUrl);
    warnings.push(...parsed.warnings);
    if (parsed.items.length === 0) break;

    for (const item of parsed.items) {
      if (torrents.length >= (opts.maxItems ?? 50)) break;
      if (seenUrls.has(item.source_url)) continue;
      seenUrls.add(item.source_url);

      if (opts.fetchDetails) {
        try {
          const full = await enrichFromDetail(item, opts);
          torrents.push(full);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          warnings.push(`Detail failed for ${item.source_url}: ${msg}`);
          torrents.push(createBaseTorrent(item));
        }
        if (opts.delayMs) await sleep(opts.delayMs);
      } else {
        torrents.push(createBaseTorrent(item));
      }
    }

    if (!parsed.nextPageUrl) break;
    if (opts.delayMs) await sleep(opts.delayMs);
  }

  return { torrents, warnings };
}