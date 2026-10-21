import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { pool } from '../../src/db/pool.js';
import { resetTestDatabase } from '../helpers/database.js';
import { signBody } from '../../src/utils/webhook-signature.js';

const item = { items: [{ productId: 'test-snack', quantity: 1 }] };

async function createOrder(quantity = 1) {
  return request(app).post('/orders').send({ items: [{ productId: 'test-snack', quantity }] });
}

async function sendWebhook(orderId: string, options: { eventId?: string; amountPaise?: number; status?: string; body?: string } = {}) {
  const body = options.body ?? JSON.stringify({
    eventId: options.eventId ?? 'evt_test_1',
    orderId,
    amountPaise: options.amountPaise ?? 4500,
    status: options.status ?? 'captured',
  });
  return request(app)
    .post('/payments/webhook')
    .set('Content-Type', 'application/json')
    .set('X-Signature', signBody(body, env.webhookSecret))
    .send(body);
}

describe('Pickup Counter PostgreSQL integration', () => {
  beforeEach(async () => resetTestDatabase());
  afterAll(async () => pool.end());

  it('allows exactly two of ten simultaneous one-unit orders', async () => {
    const responses = await Promise.all(Array.from({ length: 10 }, () => createOrder()));
    expect(responses.filter((response) => response.status === 201)).toHaveLength(2);
    expect(responses.filter((response) => response.status === 409)).toHaveLength(8);
    const inventory = await request(app).get('/products');
    expect(inventory.body.products[0].availableUnits).toBe(0);
    const counts = await pool.query('SELECT (SELECT count(*) FROM orders)::int AS orders, (SELECT count(*) FROM order_items)::int AS items');
    expect(counts.rows[0]).toEqual({ orders: 2, items: 2 });
  });

  it('processes an identical signed webhook once without deducting physical stock', async () => {
    const created = await createOrder();
    const first = await sendWebhook(created.body.id);
    const second = await sendWebhook(created.body.id);
    expect(first.status).toBe(200);
    expect(first.body.status).toBe('paid');
    expect(second.body.duplicate).toBe(true);
    expect((await pool.query('SELECT stock_quantity FROM products WHERE id = $1', ['test-snack'])).rows[0].stock_quantity).toBe(2);
    expect((await pool.query('SELECT count(*)::int AS count FROM payment_events')).rows[0].count).toBe(1);
  });

  it('allows only one simultaneous pickup claim and deducts stock once', async () => {
    const created = await createOrder();
    await sendWebhook(created.body.id);
    const claims = await Promise.all([
      request(app).post(`/orders/${created.body.id}/pickup-claim`),
      request(app).post(`/orders/${created.body.id}/pickup-claim`),
    ]);
    expect(claims.filter((claim) => claim.status === 200)).toHaveLength(1);
    expect(claims.filter((claim) => claim.status === 409)).toHaveLength(1);
    expect((await pool.query('SELECT stock_quantity FROM products WHERE id = $1', ['test-snack'])).rows[0].stock_quantity).toBe(1);
    expect((await pool.query('SELECT status FROM orders WHERE id = $1', [created.body.id])).rows[0].status).toBe('picked_up');
  });

  it('rejects invalid webhook signatures', async () => {
    const created = await createOrder();
    const response = await request(app).post('/payments/webhook').set('Content-Type', 'application/json').set('X-Signature', 'bad').send('{}');
    expect(response.status).toBe(401);
    expect((await pool.query('SELECT count(*)::int AS count FROM payment_events')).rows[0].count).toBe(0);
    expect(created.status).toBe(201);
  });

  it('moves an amount mismatch to needs_review', async () => {
    const created = await createOrder();
    const result = await sendWebhook(created.body.id, { amountPaise: 4400 });
    expect(result.body.status).toBe('needs_review');
    expect((await request(app).get(`/orders/${created.body.id}`)).body.status).toBe('needs_review');
  });

  it('reports an expired pending order as expired without a worker pass', async () => {
    const created = await createOrder();
    await pool.query("UPDATE orders SET expires_at = now() - interval '1 second' WHERE id = $1", [created.body.id]);
    const result = await request(app).get(`/orders/${created.body.id}`);
    expect(result.body.status).toBe('expired');
    expect((await request(app).get('/products')).body.products[0].availableUnits).toBe(2);
  });

  it('rejects insufficient stock and duplicate product entries', async () => {
    expect((await createOrder(3)).status).toBe(409);
    const duplicate = await request(app).post('/orders').send({ items: [item.items[0], item.items[0]] });
    expect(duplicate.status).toBe(400);
    expect((await pool.query('SELECT count(*)::int AS count FROM orders')).rows[0].count).toBe(0);
  });

  it('puts valid captured payment after expiry into needs_review', async () => {
    const created = await createOrder();
    await pool.query("UPDATE orders SET expires_at = now() - interval '1 second' WHERE id = $1", [created.body.id]);
    const response = await sendWebhook(created.body.id);
    expect(response.body.status).toBe('needs_review');
    const order = (await pool.query('SELECT status, review_reason FROM orders WHERE id = $1', [created.body.id])).rows[0];
    expect(order.status).toBe('needs_review');
    expect(order.review_reason).toBe('captured_after_expiry');
    expect((await pool.query('SELECT stock_quantity FROM products WHERE id = $1', ['test-snack'])).rows[0].stock_quantity).toBe(2);
  });

  it('rejects event ID reuse when payload bytes differ', async () => {
    const created = await createOrder();
    await sendWebhook(created.body.id, { eventId: 'evt_reused', status: 'failed' });
    const replay = await sendWebhook(created.body.id, { eventId: 'evt_reused', status: 'captured' });
    expect(replay.status).toBe(409);
  });
});
