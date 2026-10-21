import { pool } from '../src/db/pool.js';

try {
  const result = await pool.query<{ database: string; server_time: Date }>(
    'SELECT current_database() AS database, NOW() AS server_time;',
  );
  const row = result.rows[0];
  if (!row) throw new Error('The database connection returned no result row');

  console.log(JSON.stringify({ database: row.database, server_time: row.server_time }, null, 2));
  if (row.database !== 'pickup_counter') {
    console.error(`Connected to unexpected database "${row.database}"; expected "pickup_counter".`);
    process.exitCode = 1;
  }
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown database connection error';
  console.error(`Database connection test failed: ${message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
