import { execFileSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import type { TestProject } from 'vitest/node';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(here, '..');
const repoRoot = path.resolve(serverDir, '..');
const testUrl = process.env.TEST_DATABASE_URL ?? 'postgres://pickup:pickup_test_password@127.0.0.1:55433/pickup_counter_test';
const databaseName = new URL(testUrl).pathname.slice(1);
if (databaseName !== 'pickup_counter_test') throw new Error('Refusing tests: TEST_DATABASE_URL must target pickup_counter_test');
process.env.TEST_DATABASE_URL = testUrl;
process.env.DATABASE_URL = testUrl;

export default async function setup(_project: TestProject) {
  try {
    execFileSync('docker', ['compose', '--profile', 'test', 'up', '-d', 'postgres-test'], { cwd: repoRoot, stdio: 'inherit' });
  } catch {
    console.error('PostgreSQL integration tests require Docker Desktop with its Linux container engine running. Start Docker Desktop, then rerun npm test.');
    process.exit(1);
  }
  const pool = new pg.Pool({ connectionString: testUrl, connectionTimeoutMillis: 2_000 });
  let ready = false;
  let lastError: unknown;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      ready = true;
      break;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  if (!ready) {
    await pool.end();
    throw new Error(`Dedicated PostgreSQL test service did not become ready: ${String(lastError)}`);
  }

  await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const migrations = path.resolve(serverDir, 'migrations');
  for (const name of (await readdir(migrations)).filter((entry) => entry.endsWith('.sql')).sort()) {
    const applied = await pool.query('SELECT 1 FROM schema_migrations WHERE name = $1', [name]);
    if (!applied.rowCount) {
      const client = await pool.connect();
      await client.query('BEGIN');
      try {
        await client.query(await readFile(path.join(migrations, name), 'utf8'));
        await client.query('INSERT INTO schema_migrations(name) VALUES ($1)', [name]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  }
  await pool.end();

  return async () => {
    await new Promise<void>((resolve) => {
      execFileSync('docker', ['compose', '--profile', 'test', 'stop', 'postgres-test'], { cwd: repoRoot, stdio: 'inherit' });
      resolve();
    });
  };
}
