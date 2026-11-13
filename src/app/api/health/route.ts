import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

export async function GET() {
  try {
    const start = Date.now();
    await queryOne('SELECT 1');
    const dbLatency = Date.now() - start;

    return NextResponse.json({
      ok: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: 'up',
          latency_ms: dbLatency,
        },
        uptime_seconds: process.uptime(),
        memory_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        version: '1.0.0',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        checks: {
          database: {
            status: 'down',
            error: msg,
          },
        },
      },
      { status: 503 }
    );
  }
}