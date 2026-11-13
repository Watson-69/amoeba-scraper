export interface ScrapedTorrent {
  id: string;
  title: string;
  size_bytes?: number | null;
  seeders?: number;
  leechers?: number;
  uploaded_at?: Date | null;
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
  raw_meta?: Record<string, unknown> | null;
}

export interface ScrapeOptions {
  query?: string;
  maxPages?: number;
  maxItems?: number;
  delayMs?: number;
  timeoutMs?: number;
  userAgent?: string;
  fetchDetails?: boolean;
}

export interface ScrapePageResult {
  items: ScrapedTorrent[];
  nextPageUrl?: string | null;
  warnings: string[];
}