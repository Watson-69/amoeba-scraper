import { readFileSync } from 'fs';
import { join, resolve } from 'path';
import mysql from 'mysql2/promise';
import { env } from '../src/lib/config';

// Use process.cwd() to avoid import.meta.url issues with Next.js type checking
const BASE_DIR = resolve(process.cwd(), 'scripts');

/**
 * Initialize the database by running schema.sql.
 * Usage: npx tsx scripts/init-db.ts  (or: npm run db:init)
 */
function parseSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1];

    if (!inSingleQuote && !inDoubleQuote && !inBacktick && !inBlockComment) {
      if (char === '-' && nextChar === '-') {
        inLineComment = true;
        current += char;
        continue;
      }
      if (char === '\n' && inLineComment) {
        inLineComment = false;
        current += char;
        continue;
      }
    }

    if (!inSingleQuote && !inDoubleQuote && !inBacktick && !inLineComment) {
      if (char === '/' && nextChar === '*') {
        inBlockComment = true;
        current += char;
        continue;
      }
      if (char === '*' && nextChar === '/' && inBlockComment) {
        inBlockComment = false;
        current += char + '/';
        i++;
        continue;
      }
    }

    if (inLineComment || inBlockComment) {
      current += char;
      continue;
    }

    if (char === "'" && !inDoubleQuote && !inBacktick) {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote && !inBacktick) {
      inDoubleQuote = !inDoubleQuote;
    } else if (char === '`' && !inSingleQuote && !inDoubleQuote) {
      inBacktick = !inBacktick;
    }

    current += char;

    if (char === ';' && !inSingleQuote && !inDoubleQuote && !inBacktick) {
      const stmt = current.trim();
      if (stmt.length > 0) {
        statements.push(stmt);
      }
      current = '';
    }
  }

  const remaining = current.trim();
  if (remaining.length > 0) {
    statements.push(remaining);
  }

  return statements;
}

async function initDb(): Promise<void> {
  const schemaPath = join(BASE_DIR, 'schema.sql');
  const sql = readFileSync(schemaPath, 'utf-8');

  const statements = parseSqlStatements(sql);

  console.log(`[init-db] Applying ${statements.length} statements...`);

  const conn = await mysql.createConnection({
    host: env.MYSQL_HOST,
    port: env.MYSQL_PORT,
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    charset: 'utf8mb4',
  });

  try {
    for (const stmt of statements) {
      try {
        if (stmt.toUpperCase().startsWith('USE ') || stmt.toUpperCase().startsWith('CREATE DATABASE')) {
          await conn.query(stmt);
        } else {
          await conn.execute(stmt);
        }
      } catch (err) {
        console.error('[init-db] Failed statement:', stmt.slice(0, 120));
        throw err;
      }
    }
    console.log('[init-db] Schema applied successfully.');
  } finally {
    await conn.end();
  }
}

initDb().catch((err) => {
  console.error('[init-db] Fatal:', err);
  process.exit(1);
});