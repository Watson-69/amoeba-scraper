import { runCronSync } from '@/lib/scrape-service';
import { env } from '@/lib/config';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    const result = await runCronSync();

    return Response.json({
      ok: true,
      itemsChecked: result.itemsChecked,
      warnings: result.warnings,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[cron] Sync error:', msg);
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}