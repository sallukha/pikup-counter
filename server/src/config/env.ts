import dotenv from 'dotenv';

dotenv.config();

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const port = Number(process.env.PORT ?? 4000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}

const webhookSecret = required('PAYMENT_WEBHOOK_SECRET');
if (Buffer.byteLength(webhookSecret, 'utf8') < 32) {
  throw new Error('PAYMENT_WEBHOOK_SECRET must contain at least 32 bytes');
}

const databaseUrl = required('DATABASE_URL');
try {
  new URL(databaseUrl);
} catch {
  throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL');
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port,
  databaseUrl,
  webhookSecret,
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:4000',
};
