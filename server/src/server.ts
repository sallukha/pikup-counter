import { createServer } from 'node:http';
import { app } from './app.js';
import { env } from './config/env.js';
import { pool } from './db/pool.js';

const server = createServer(app);
const expiryWorker = setInterval(() => {
  void pool.query("UPDATE orders SET status = 'expired' WHERE status = 'pending' AND expires_at <= clock_timestamp()")
    .catch((error: unknown) => console.error('Order expiry pass failed:', error instanceof Error ? error.message : 'unknown error'));
}, 5_000);
expiryWorker.unref();

server.listen(env.port, '0.0.0.0', () => {
  console.log(`Pickup Counter API listening on port ${env.port}`);
});

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}; shutting down`);
  clearInterval(expiryWorker);
  server.close(async (error) => {
    if (error) console.error('HTTP server close failed:', error.message);
    await pool.end();
    process.exit(error ? 1 : 0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
