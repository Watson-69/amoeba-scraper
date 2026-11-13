import { config } from 'dotenv';
config({ path: '.env.local' });

import { runScrape } from '../src/lib/scrape-service';

async function main() {
  const args = process.argv.slice(2);
  const query = args.find(a => a.startsWith('--query='))?.split('=')[1];
  const maxPages = Number(args.find(a => a.startsWith('--pages='))?.split('=')[1] ?? '3');
  const maxItems = Number(args.find(a => a.startsWith('--items='))?.split('=')[1] ?? '50');
  const fetchDetails = !args.includes('--no-details');
  const fullArchive = args.includes('--full');

  console.log('[scrape] Starting scrape...', { query, maxPages, maxItems, fetchDetails, fullArchive });

  try {
    const result = await runScrape({ query, maxPages, maxItems, fetchDetails, fullArchive });
    console.log(`[scrape] Found: ${result.found}, Inserted: ${result.inserted}, Updated: ${result.updated}`);
    if (result.warnings.length) console.warn('[scrape] Warnings:', result.warnings);
    console.log('[scrape] Done.');
    process.exit(0);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[scrape] Fatal:', msg);
    process.exit(1);
  }
}

main();