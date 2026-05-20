import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Client } from 'pg';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

const TEST_DB_NAME = process.env.TEST_DB_NAME ?? 'urlshort_test';
const BASE_PG_URL =
  process.env.DATABASE_URL ?? 'postgres://urlshort:urlshort@localhost:5432/urlshort';

function withDatabase(url: string, db: string): string {
  const u = new URL(url);
  u.pathname = `/${db}`;
  return u.toString();
}

export async function ensureTestDatabase(): Promise<string> {
  const adminUrl = withDatabase(BASE_PG_URL, 'postgres');
  const client = new Client({ connectionString: adminUrl });
  await client.connect();
  const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [TEST_DB_NAME]);
  if (exists.rowCount === 0) {
    await client.query(`CREATE DATABASE "${TEST_DB_NAME}"`);
  }
  await client.end();
  return withDatabase(BASE_PG_URL, TEST_DB_NAME);
}

export async function createTestApp(): Promise<INestApplication> {
  const testDbUrl = await ensureTestDatabase();
  process.env.DATABASE_URL = testDbUrl;
  process.env.JWT_ACCESS_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  process.env.PUBLIC_BASE_URL = 'http://test';
  process.env.NODE_ENV = 'test';

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.use(cookieParser());
  app.enableCors({ origin: true, credentials: true });
  await app.init();
  return app;
}

export async function truncateAll(): Promise<void> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query('TRUNCATE TABLE clicks, links, users RESTART IDENTITY CASCADE');
  await client.end();
}
