import { describe, it, expect } from 'vitest';
import { makeTorrentId } from '../src/lib/scraper';
import { env } from '../src/lib/config';
import { DEFAULT_SCRAPER_OPTIONS } from '../src/lib/scrape-service';

describe('Config', () => {
  it('should load environment variables with defaults', () => {
    expect(env.MYSQL_HOST).toBeDefined();
    expect(env.MYSQL_PORT).toBeDefined();
    expect(env.MYSQL_USER).toBeDefined();
    expect(env.MYSQL_DATABASE).toBeDefined();
  });

  it('should have correct database name', () => {
    expect(env.MYSQL_DATABASE).toBe('amoeba_scraper');
  });
});

describe('makeTorrentId', () => {
  it('should generate consistent IDs from info hash', () => {
    const id1 = makeTorrentId('amoeba', 'abc123', 'title');
    const id2 = makeTorrentId('amoeba', 'abc123', 'title');
    expect(id1).toBe(id2);
    expect(id1).toContain('amoeba:');
  });

  it('should generate different IDs for different sources', () => {
    const id1 = makeTorrentId('amoeba', 'abc123');
    const id2 = makeTorrentId('other', 'abc123');
    expect(id1).not.toBe(id2);
  });

  it('should generate different IDs for different hashes', () => {
    const id1 = makeTorrentId('amoeba', 'hash1');
    const id2 = makeTorrentId('amoeba', 'hash2');
    expect(id1).not.toBe(id2);
  });

  it('should fallback to title when no info hash', () => {
    const id = makeTorrentId('amoeba', null, 'Test Game');
    expect(id).toContain('amoeba:');
  });
});

describe('Scraper options', () => {
  it('should have correct default retry config', () => {
    expect(DEFAULT_SCRAPER_OPTIONS.maxRetries).toBe(2);
    expect(DEFAULT_SCRAPER_OPTIONS.baseDelayMs).toBe(3000);
  });
});