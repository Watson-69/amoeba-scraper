import { config } from 'dotenv';
import { z } from 'zod';

config({ path: '.env.local' });

const envSchema = z.object({
  MYSQL_HOST: z.string().default('localhost'),
  MYSQL_PORT: z.coerce.number().default(3306),
  MYSQL_USER: z.string().default('root'),
  MYSQL_PASSWORD: z.string().default(''),
  MYSQL_DATABASE: z.string().default('amoeba_scraper'),
  CRON_SECRET: z.string().optional(),
  SCRAPER_DELAY_MS: z.coerce.number().default(900),
  SCRAPER_TIMEOUT_MS: z.coerce.number().default(20000),
  SCRAPER_USER_AGENT: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';

export type Env = z.infer<typeof envSchema>;