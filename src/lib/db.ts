import mysql from 'mysql2/promise';
import { env } from './config';

export interface PoolConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  waitForConnections: boolean;
  connectionLimit: number;
  queueLimit: number;
  namedPlaceholders: boolean;
  charset: string;
}

function createPoolConfig(): PoolConfig {
  return {
    host: env.MYSQL_HOST,
    port: env.MYSQL_PORT,
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    namedPlaceholders: true,
    charset: 'utf8mb4',
  };
}

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(createPoolConfig());
  }
  return pool;
}

export function resetPool(): void {
  if (pool) {
    pool.end();
    pool = null;
  }
}

type QueryParams = Record<string, unknown>;

export async function query<T = unknown>(sql: string, params: QueryParams = {}): Promise<T[]> {
  const p = getPool();
  const [rows] = await p.execute(sql, params as Parameters<typeof p.execute>[1]);
  return rows as T[];
}

export async function queryOne<T = unknown>(sql: string, params: QueryParams = {}): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function execute(sql: string, params: QueryParams = {}): Promise<{ affectedRows: number; insertId: number }> {
  const p = getPool();
  const [result] = await p.execute(sql, params as Parameters<typeof p.execute>[1]);
  return result as { affectedRows: number; insertId: number };
}

export async function transaction<T>(callback: (conn: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const p = getPool();
  const conn = await p.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export function isPoolInitialized(): boolean {
  return pool !== null;
}