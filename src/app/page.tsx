export default function Home() {
  const bodyParams = 'query, maxPages, maxItems, fetchDetails, fullArchive';
  const gamesParams = 'page, limit, category, sortBy, q';
  const searchParams = 'q, category, source, minSeeders, page, limit, sortBy, live';
  const statsParams = 'ids=comma,separated';

  const endpoints = [
    { method: 'POST', path: '/api/scrape', desc: `Trigger a scrape (body: { ${bodyParams} })` },
    { method: 'GET', path: '/api/scrape', desc: 'Get last scrape status' },
    { method: 'GET', path: '/api/games', desc: `List scraped games (params: ${gamesParams})` },
    { method: 'GET', path: '/api/search', desc: `Search games (params: ${searchParams})` },
    { method: 'GET', path: '/api/torrents/[id]', desc: 'Get single torrent by ID' },
    { method: 'GET', path: '/api/torrents/stats', desc: `Get seeder/leecher stats for IDs (params: ${statsParams})` },
    { method: 'GET', path: '/api/cron/sync', desc: 'Background sync endpoint (requires CRON_SECRET auth)' },
  ];

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>amoeba-scraper</h1>
      <p>FitGirl Repacks scraper API with MySQL storage.</p>
      <h2>Endpoints</h2>
      <ul>
        {endpoints.map((ep, i) => (
          <li key={i}><code>{ep.method} {ep.path}</code> - {ep.desc}</li>
        ))}
      </ul>
    </main>
  );
}