import { createHash } from 'node:crypto';
import { inTransaction } from '../db/transaction.js';
import { HttpError } from '../types/errors.js';

interface WebhookPayload {
  eventId: string;
  orderId: string;
  amountPaise: number;
  status: string;
}

function parsePayload(rawBody: Buffer): WebhookPayload {
  let value: unknown;
  try {
    value = JSON.parse(rawBody.toString('utf8')) as unknown;
  } catch {
    throw new HttpError(400, 'INVALID_JSON', 'Webhook body must be valid JSON');
  }
  if (!value || typeof value !== 'object') throw new HttpError(400, 'INVALID_EVENT', 'Webhook body must be a JSON object');
  const event = value as Record<string, unknown>;
  if (typeof event.eventId !== 'string' || event.eventId.length < 1 || event.eventId.length > 200) {
    throw new HttpError(400, 'INVALID_EVENT_ID', 'eventId must be a string up to 200 characters');
  }
  if (typeof event.orderId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(event.orderId)) {
    throw new HttpError(400, 'INVALID_ORDER_ID', 'orderId must be a UUID');
  }
  if (!Number.isSafeInteger(event.amountPaise) || (event.amountPaise as number) < 0 || (event.amountPaise as number) > 2_000_000_000) {
    throw new HttpError(400, 'INVALID_AMOUNT', 'amountPaise must be a non-negative integer');
  }
  if (typeof event.status !== 'string' || event.status.length < 1 || event.status.length > 40) {
    throw new HttpError(400, 'INVALID_STATUS', 'status must be a string up to 40 characters');
  }
  return { eventId: event.eventId, orderId: event.orderId, amountPaise: event.amountPaise as number, status: event.status.toLowerCase() };
}

export async function processPaymentWebhook(rawBody: Buffer) {
  const event = parsePayload(rawBody);
  const payloadHash = createHash('sha256').update(rawBody).digest('hex');

  return inTransaction(async (client) => {
    const inserted = await client.query(
      `INSERT INTO payment_events(event_id, order_id, amount_paise, status, payload_hash)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (event_id) DO NOTHING RETURNING event_id`,
      [event.eventId, event.orderId, event.amountPaise, event.status, payloadHash],
    );
    if (!inserted.rowCount) {
      const existing = await client.query('SELECT payload_hash FROM payment_events WHERE event_id = $1', [event.eventId]);
      if (!existing.rowCount) throw new Error('Conflicting webhook event disappeared');
      if (existing.rows[0].payload_hash !== payloadHash) {
        console.warn(`Webhook event ID reused with different payload (event ${event.eventId.slice(0, 12)})`);
        throw new HttpError(409, 'EVENT_ID_REUSED', 'eventId was already used with a different payload');
      }
      return { received: true, duplicate: true };
    }

    const locked = await client.query(
      `SELECT id, status, total_paise, expires_at <= clock_timestamp() AS expired
       FROM orders WHERE id = $1 FOR UPDATE`, [event.orderId],
    );
    if (!locked.rowCount) throw new HttpError(404, 'ORDER_NOT_FOUND', 'Order was not found');
    const order = locked.rows[0] as { status: string; total_paise: number; expired: boolean };
    let status = order.status;
    let reason: string | null = null;

    if (order.status === 'pending' && order.expired) {
      await client.query("UPDATE orders SET status = 'expired' WHERE id = $1", [event.orderId]);
      status = 'expired';
    }

    if (event.amountPaise !== order.total_paise) {
      status = 'needs_review';
      reason = 'payment_amount_mismatch';
    } else if (event.status === 'captured' && !['picked_up', 'paid'].includes(status)) {
      if (status === 'pending') {
        status = 'paid';
        await client.query("UPDATE orders SET status = 'paid', paid_at = clock_timestamp() WHERE id = $1", [event.orderId]);
      } else {
        reason = status === 'expired' ? 'captured_after_expiry' : 'captured_without_active_reservation';
        status = 'needs_review';
      }
    }

    if (status === 'needs_review') {
      await client.query(
        "UPDATE orders SET status = 'needs_review', review_reason = $2 WHERE id = $1",
        [event.orderId, reason ?? 'payment_requires_review'],
      );
    }
    return { received: true, duplicate: false, status };
  });
}
