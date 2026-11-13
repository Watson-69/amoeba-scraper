import { query, queryOne } from '@/lib/db';

type DbRow = Record<string, unknown>;

function asString(v: unknown): string | null {
  return typeof v === 'string' ? v : v == null ? null : String(v);
}
function asNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
function parseGenres(v: unknown): string[] | undefined {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p.filter((x): x is string => typeof x === 'string') : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

interface Torrent {
  id: string;
  title: string;
  size_bytes: number | null;
  seeders: number;
  leechers: number;
  uploaded_at: string | null;
  category: string | null;
  source_site: string;
  magnet_link: string | null;
  info_hash: string | null;
  description: string | null;
  poster_url: string | null;
  year: number | null;
  rating: number | null;
  genres: string[] | undefined;
  details: string | null;
}

function rowToTorrent(row: DbRow): Torrent {
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    size_bytes: asNumber(row.size_bytes),
    seeders: asNumber(row.seeders) ?? 0,
    leechers: asNumber(row.leechers) ?? 0,
    uploaded_at: asString(row.uploaded_at),
    category: asString(row.category),
    source_site: String(row.source_site ?? ''),
    magnet_link: asString(row.magnet_link),
    info_hash: asString(row.info_hash),
    description: asString(row.description),
    poster_url: asString(row.poster_url),
    year: asNumber(row.year),
    rating: asNumber(row.rating),
    genres: parseGenres(row.genres_json),
    details: asString(row.details),
  };
}

export interface SearchParams {
  q?: string;
  category?: string;
  minSeeders?: number;
  page?: number;
  limit?: number;
  source?: string;
  sortBy?: 'date' | 'size' | 'seeders' | 'relevance';
}

function buildBaseQuery(params: SearchParams): { whereBase: string; baseParams: Record<string, unknown>; limit: number; offset: number; page: number } {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(50, Math.max(1, params.limit ?? 24));
  const offset = (page - 1) * limit;
  const baseParams: Record<string, unknown> = { limit, offset };
  const filters: string[] = ['1=1'];

  if (params.category) {
    filters.push('category = :category');
    baseParams.category = params.category;
  }
  if (params.source) {
    filters.push('source_site = :source');
    baseParams.source = params.source;
  }
  if (typeof params.minSeeders === 'number' && Number.isFinite(params.minSeeders)) {
    filters.push('seeders >= :minSeeders');
    baseParams.minSeeders = Math.max(0, Math.floor(params.minSeeders));
  }

  return { whereBase: filters.join(' AND '), baseParams, limit, offset, page };
}

function getOrderBy(sort: string): string {
  switch (sort) {
    case 'date':
      return 'uploaded_at DESC, seeders DESC, id DESC';
    case 'size':
      return 'size_bytes DESC, seeders DESC, uploaded_at DESC';
    case 'seeders':
      return 'seeders DESC, uploaded_at DESC, id DESC';
    case 'relevance':
    default:
      return 'seeders DESC, uploaded_at DESC, id DESC';
  }
}

async function runBaseQuery(
  whereBase: string,
  baseParams: Record<string, unknown>,
  order: string,
  limit: number,
  offset: number
): Promise<{ items: Torrent[]; total: number }> {
  const items = await query<DbRow>(
    `SELECT id, title, size_bytes, seeders, leechers, uploaded_at, category, source_site, magnet_link, info_hash, description, poster_url, genres_json, year, rating, details
     FROM torrents WHERE ${whereBase} ORDER BY ${order} LIMIT :limit OFFSET :offset`,
    { ...baseParams, limit, offset }
  );
  const totalRow = await queryOne<DbRow>(`SELECT COUNT(*) AS total FROM torrents WHERE ${whereBase}`, baseParams);
  return { items: items.map(rowToTorrent), total: Number(totalRow?.total ?? 0) };
}

async function fetchCandidatePool(
  whereBase: string,
  baseParams: Record<string, unknown>,
  order: string,
  maxCandidates: number
): Promise<Torrent[]> {
  const items = await query<DbRow>(
    `SELECT id, title, size_bytes, seeders, leechers, uploaded_at, category, source_site, magnet_link, info_hash, description, poster_url, genres_json, year, rating, details
     FROM torrents WHERE ${whereBase} ORDER BY ${order} LIMIT :limit`,
    { ...baseParams, limit: maxCandidates }
  );
  return items.map(rowToTorrent);
}

function simpleSearchFilter(query: string, candidates: Torrent[]): Torrent[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
  if (tokens.length === 0) return candidates;
  return candidates.filter(item => {
    const haystack = `${item.title} ${item.description ?? ''} ${item.genres?.join(' ') ?? ''}`.toLowerCase();
    return tokens.every(token => haystack.includes(token));
  });
}

export async function searchTorrents(params: SearchParams): Promise<{ items: Torrent[]; total: number; page: number; limit: number; strategy: string }> {
  const q = (params.q ?? '').trim();
  const sortBy = params.sortBy ?? 'relevance';
  const { whereBase, baseParams, limit, offset, page } = buildBaseQuery(params);

  if (!q) {
    const res = await runBaseQuery(whereBase, baseParams, getOrderBy(sortBy), limit, offset);
    return { ...res, page, limit, strategy: 'recent' };
  }

  const candidatePool = await fetchCandidatePool(whereBase, baseParams, 'seeders DESC, uploaded_at DESC, id DESC', 200);
  const filtered = simpleSearchFilter(q, candidatePool);
  const paginated = filtered.slice(offset, offset + limit);

  return { items: paginated, total: filtered.length, page, limit, strategy: 'text-search' };
}

export async function getTorrentById(id: string): Promise<Torrent | null> {
  const row = await queryOne<DbRow>(
    `SELECT id, title, size_bytes, seeders, leechers, uploaded_at, category, source_site, magnet_link, info_hash, description, poster_url, genres_json, year, rating, details
     FROM torrents WHERE id = :id LIMIT 1`,
    { id }
  );
  return row ? rowToTorrent(row) : null;
}