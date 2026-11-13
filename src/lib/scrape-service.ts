import { scrapeFitGirl } from '@/lib/scrapers/fitgirl';
import { upsertTorrents, logScrapeRun, scrapeWithRetry } from '@/lib/scraper';
import type { ScraperOptions } from '@/lib/scraper';

export interface ScrapeExecutionOptions {
  query?: string;
  maxPages?: number;
  maxItems?: number;
  fetchDetails?: boolean;
  fullArchive?: boolean;
}

export interface ScrapeExecutionResult {
  found: number;
  inserted: number;
  updated: number;
  warnings: string[];
}

export const DEFAULT_SCRAPER_OPTIONS: ScraperOptions = {
  maxRetries: 2,
  baseDelayMs: 3000,
};

function getArchiveOptions(): ScrapeExecutionOptions {
  return {
    maxPages: 20,
    maxItems: 1000,
    fetchDetails: true,
    fullArchive: true,
  };
}

function getTargetedOptions(opts: ScrapeExecutionOptions): ScrapeExecutionOptions {
  return {
    query: opts.query,
    maxPages: opts.maxPages ?? 3,
    maxItems: opts.maxItems ?? 50,
    fetchDetails: opts.fetchDetails ?? true,
    fullArchive: false,
  };
}

async function executeScrape(
  scrapeOpts: ScrapeExecutionOptions
): Promise<ScrapeExecutionResult> {
  const { query, maxPages, maxItems, fetchDetails, fullArchive } = scrapeOpts;

  let totalFound = 0;
  let totalInserted = 0;
  let totalUpdated = 0;
  const allWarnings: string[] = [];

  if (fullArchive) {
    console.log('[scrape] Starting full archive scrape...');
    const result = await scrapeFitGirl({
      maxPages,
      maxItems,
      fetchDetails,
      delayMs: 1000,
      query: undefined,
    });

    if (result.torrents.length > 0) {
      const { inserted, updated } = await upsertTorrents(result.torrents);
      totalFound = result.torrents.length;
      totalInserted = inserted;
      totalUpdated = updated;
      allWarnings.push(...result.warnings);
      console.log(`[scrape] Full archive: ${result.torrents.length} items, ${inserted} inserted, ${updated} updated`);
    }
  } else {
    console.log('[scrape] Starting targeted scrape for:', query);
    const scraped = await scrapeWithRetry('amoeba', async () => {
      console.log('[scrape] Calling scrapeFitGirl with:', { query, maxPages, maxItems, fetchDetails });
      const result = await scrapeFitGirl({
        query,
        maxPages,
        maxItems,
        fetchDetails,
        delayMs: 900,
      });
      return result.torrents;
    }, DEFAULT_SCRAPER_OPTIONS);

    console.log('[scrape] Scrape result:', {
      torrentsCount: scraped.torrents?.length ?? 'undefined',
      errors: scraped.errors,
      warnings: scraped.warnings,
    });

    if (scraped.errors.length > 0) {
      const msg = scraped.errors.join('; ');
      console.error('[scrape] Scraping failed:', msg);
      await logScrapeRun('amoeba', 'failed', 0, 0, 0, msg);
      throw new Error(msg);
    }

    if (scraped.torrents.length > 0) {
      const { inserted, updated } = await upsertTorrents(scraped.torrents);
      await logScrapeRun(
        'amoeba',
        (scraped.warnings?.length ?? 0) > 0 ? 'partial' : 'success',
        scraped.torrents.length,
        inserted,
        updated,
        [...scraped.errors, ...(scraped.warnings ?? [])].join('; ') || undefined
      );
      totalFound = scraped.torrents.length;
      totalInserted = inserted;
      totalUpdated = updated;
      allWarnings.push(...(scraped.warnings ?? []));
    } else {
      await logScrapeRun('amoeba', 'success', 0, 0, 0, 'No results found');
    }
  }

  return {
    found: totalFound,
    inserted: totalInserted,
    updated: totalUpdated,
    warnings: allWarnings,
  };
}

export async function runScrape(opts: ScrapeExecutionOptions = {}): Promise<ScrapeExecutionResult> {
  const scrapeOpts = opts.fullArchive ? getArchiveOptions() : getTargetedOptions(opts);
  return executeScrape(scrapeOpts);
}

export async function runCronSync(): Promise<{ itemsChecked: number; warnings: string[] }> {
  console.log('[cron] Starting background sync...');
  const startTime = Date.now();

  const res = await scrapeFitGirl({
    maxPages: 2,
    maxItems: 25,
    fetchDetails: true,
    delayMs: 1000,
    query: undefined,
  });

  if (res.torrents.length > 0) {
    const { inserted, updated } = await upsertTorrents(res.torrents);
    console.log(`[cron] Sync: ${res.torrents.length} items checked, ${inserted} inserted, ${updated} updated`);
  }

  const duration = Date.now() - startTime;
  console.log(`[cron] Sync completed in ${duration}ms`);

  return {
    itemsChecked: res.torrents.length,
    warnings: res.warnings,
  };
}