import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db/pool.js';
import { inTransaction } from '../src/db/transaction.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const candidates = [path.resolve(here, '../migrations'), path.resolve(here, '../../migrations')];
const migrationDir = candidates.find((candidate) => existsSync(candidate));
if (!migrationDir) throw new Error('Could not locate the migrations directory');

try {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const names = (await readdir(migrationDir)).filter((name) => name.endsWith('.sql')).sort();
  for (const name of names) {
    await inTransaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock($1)', [81720421]);
      const existing = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [name]);
      if (existing.rowCount) return;
      const sql = await readFile(path.join(migrationDir, name), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(name) VALUES ($1)', [name]);
      console.log(`Applied migration ${name}`);
    });
  }
} finally {
  await pool.end();
}
