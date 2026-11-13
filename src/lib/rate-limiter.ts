import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

const store: RateLimitStore = {};

export function createRateLimiter(config: RateLimitConfig) {
  return function rateLimiter(request: NextRequest): NextResponse | null {
    const key = `${config.keyPrefix}:${getClientIp(request)}`;
    const now = Date.now();

    if (!store[key] || now > store[key].resetTime) {
      store[key] = { count: 0, resetTime: now + config.windowMs };
    }

    store[key].count++;

    const remaining = Math.max(0, config.maxRequests - store[key].count);
    const reset = new Date(store[key].resetTime).toISOString();

    const headers = {
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': reset,
    };

    if (store[key].count > config.maxRequests) {
      return NextResponse.json(
        { ok: false, error: 'Too Many Requests', retryAfter: Math.ceil((store[key].resetTime - now) / 1000) },
        { status: 429, headers }
      );
    }

    return null;
  };
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

export const scrapeRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  keyPrefix: 'scrape',
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60,
  keyPrefix: 'api',
});

export const cronRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 5,
  keyPrefix: 'cron',
});