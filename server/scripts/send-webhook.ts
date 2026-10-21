import { createHmac } from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const orderId = argument('order-id');
const amountPaise = Number(argument('amount-paise'));
const eventId = argument('event-id');
const status = argument('status') ?? 'captured';
const secret = process.env.PAYMENT_WEBHOOK_SECRET;
const apiBaseUrl = (process.env.API_BASE_URL ?? 'http://localhost:4000').replace(/\/+$/, '');

if (!orderId || !eventId || !Number.isSafeInteger(amountPaise) || amountPaise < 0 || !secret) {
  console.error('Usage: npm run send-webhook -- --order-id UUID --amount-paise INTEGER --event-id EVENT_ID [--status captured]');
  console.error('Set PAYMENT_WEBHOOK_SECRET and optionally API_BASE_URL in the environment or server/.env.');
  process.exit(2);
}

const body = JSON.stringify({ eventId, orderId, amountPaise, status });
const signature = createHmac('sha256', secret).update(body).digest('hex');
const response = await fetch(`${apiBaseUrl}/payments/webhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Signature': signature },
  body,
});
const responseBody = await response.text();
console.log(`HTTP ${response.status} ${response.statusText}`);
console.log(responseBody);
if (!response.ok) process.exitCode = 1;
