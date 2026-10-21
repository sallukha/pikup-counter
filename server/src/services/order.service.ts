import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { inTransaction } from '../db/transaction.js';
import { HttpError } from '../types/errors.js';

const HOLD_SECONDS = 120;
const PRODUCT_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/;

export interface RequestedItem {
  productId: string;
  quantity: number;
}

function validateItems(body: unknown): RequestedItem[] {
  if (!body || typeof body !== 'object' || !Array.isArray((body as { items?: unknown }).items)) {
    throw new HttpError(400, 'INVALID_REQUEST', 'Request body must contain an items array');
  }
  const items = (body as { items: unknown[] }).items;
  if (!items.length || items.length > 50) {
    throw new HttpError(400, 'INVALID_ITEMS', 'Order must contain between 1 and 50 items');
  }
  const seen = new Set<string>();
  return items.map((item) => {
    if (!item || typeof item !== 'object') throw new HttpError(400, 'INVALID_ITEM', 'Each item must be an object');
    const { productId, quantity } = item as Record<string, unknown>;
    if (typeof productId !== 'string' || !PRODUCT_ID.test(productId)) {
      throw new HttpError(400, 'INVALID_PRODUCT_ID', 'Each item must have a valid productId');
    }
    if (!Number.isSafeInteger(quantity) || (quantity as number) <= 0 || (quantity as number) > 1000) {
      throw new HttpError(400, 'INVALID_QUANTITY', 'Quantity must be a positive integer no greater than 1000');
    }
    if (seen.has(productId)) throw new HttpError(400, 'DUPLICATE_PRODUCT', 'Duplicate product entries are not allowed');
    seen.add(productId);
    return { productId, quantity: quantity as number };
  });
}

async function markExpired(client: PoolClient, orderId: string) {
  await client.query(
    `UPDATE orders SET status = 'expired'
     WHERE id = $1 AND status = 'pending' AND expires_at <= clock_timestamp()`,
    [orderId],
  );
}

export async function createOrder(body: unknown) {
  const items = validateItems(body);
  const orderedIds = items.map((item) => item.productId).sort();
  return inTransaction(async (client) => {
    // Locks are always acquired in product-ID order to avoid reservation deadlocks.
    const locked = await client.query(
      'SELECT id FROM products WHERE id = ANY($1::text[]) ORDER BY id FOR UPDATE',
      [orderedIds],
    );
    if (locked.rowCount !== orderedIds.length) {
      const found = new Set(locked.rows.map((row) => row.id as string));
      const missing = orderedIds.find((id) => !found.has(id));
      throw new HttpError(404, 'PRODUCT_NOT_FOUND', `Product ${missing} was not found`);
    }

    const products = await client.query(
      `SELECT p.id, p.name, p.price_paise, p.stock_quantity,
         COALESCE((SELECT SUM(oi.quantity)::int FROM order_items oi JOIN orders o ON o.id = oi.order_id
           WHERE oi.product_id = p.id
             AND ((o.status = 'pending' AND o.expires_at > clock_timestamp()) OR o.status = 'paid')), 0) AS reserved
       FROM products p WHERE p.id = ANY($1::text[]) ORDER BY p.id`,
      [orderedIds],
    );
    const rows = new Map<string, { name: string; price_paise: number; stock_quantity: number; reserved: number }>(
      products.rows.map((row) => [row.id as string, row]),
    );
    let totalPaise = 0;
    for (const item of items) {
      const product = rows.get(item.productId)!;
      if (product.stock_quantity - product.reserved < item.quantity) {
        throw new HttpError(409, 'INSUFFICIENT_STOCK', `Insufficient stock for ${product.name}`);
      }
      totalPaise += product.price_paise * item.quantity;
      if (!Number.isSafeInteger(totalPaise) || totalPaise > 2_000_000_000) {
        throw new HttpError(400, 'ORDER_TOTAL_TOO_LARGE', 'Order total exceeds the supported amount');
      }
    }

    const id = randomUUID();
    const order = await client.query(
      `INSERT INTO orders(id, status, total_paise, expires_at)
       VALUES ($1, 'pending', $2, clock_timestamp() + ($3 * interval '1 second'))
       RETURNING id, total_paise AS "totalPaise", status, expires_at AS "expiresAt", created_at AS "createdAt"`,
      [id, totalPaise, HOLD_SECONDS],
    );
    for (const item of items) {
      const product = rows.get(item.productId)!;
      await client.query(
        `INSERT INTO order_items(order_id, product_id, product_name, quantity, unit_price_paise)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, item.productId, product.name, item.quantity, product.price_paise],
      );
    }
    const timing = await client.query(
      `SELECT GREATEST(0, CEIL(EXTRACT(EPOCH FROM (expires_at - clock_timestamp()))))::int AS "expiresInSeconds"
       FROM orders WHERE id = $1`, [id],
    );
    return { ...order.rows[0], expiresInSeconds: timing.rows[0].expiresInSeconds };
  });
}

export async function getOrder(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new HttpError(400, 'INVALID_ORDER_ID', 'Order ID must be a UUID');
  return inTransaction(async (client) => {
    await markExpired(client, id);
    const result = await client.query(
      `SELECT id, status, total_paise AS "totalPaise", expires_at AS "expiresAt",
        GREATEST(0, CEIL(EXTRACT(EPOCH FROM (expires_at - clock_timestamp()))))::int AS "expiresInSeconds",
        created_at AS "createdAt", paid_at AS "paidAt", picked_up_at AS "pickedUpAt", review_reason AS "reviewReason"
       FROM orders WHERE id = $1`, [id],
    );
    if (!result.rowCount) throw new HttpError(404, 'ORDER_NOT_FOUND', 'Order was not found');
    const itemResult = await client.query(
      `SELECT product_id AS "productId", product_name AS name, quantity, unit_price_paise AS "pricePaise"
       FROM order_items WHERE order_id = $1 ORDER BY product_id`, [id],
    );
    return { ...result.rows[0], items: itemResult.rows };
  });
}

export async function cancelOrder(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new HttpError(400, 'INVALID_ORDER_ID', 'Order ID must be a UUID');
  return inTransaction(async (client) => {
    await client.query('SELECT id FROM orders WHERE id = $1 FOR UPDATE', [id]);
    const result = await client.query(
      `UPDATE orders SET status = 'cancelled'
       WHERE id = $1 AND status = 'pending' AND expires_at > clock_timestamp()
       RETURNING id, status`, [id],
    );
    if (result.rowCount) return result.rows[0];
    const check = await client.query('SELECT status FROM orders WHERE id = $1', [id]);
    if (!check.rowCount) throw new HttpError(404, 'ORDER_NOT_FOUND', 'Order was not found');
    if (check.rows[0].status === 'pending') await markExpired(client, id);
    throw new HttpError(409, 'ORDER_NOT_CANCELLABLE', 'Only an active pending order can be cancelled');
  });
}

export async function claimPickup(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new HttpError(400, 'INVALID_ORDER_ID', 'Order ID must be a UUID');
  return inTransaction(async (client) => {
    const lockedOrder = await client.query('SELECT id, status FROM orders WHERE id = $1 FOR UPDATE', [id]);
    if (!lockedOrder.rowCount) throw new HttpError(404, 'ORDER_NOT_FOUND', 'Order was not found');
    if (lockedOrder.rows[0].status !== 'paid') {
      throw new HttpError(409, 'ORDER_NOT_READY', 'Only a paid order can be claimed for pickup');
    }
    const items = await client.query('SELECT product_id, quantity FROM order_items WHERE order_id = $1 ORDER BY product_id', [id]);
    for (const item of items.rows) {
      const product = await client.query('SELECT stock_quantity FROM products WHERE id = $1 FOR UPDATE', [item.product_id]);
      if (!product.rowCount || product.rows[0].stock_quantity < item.quantity) {
        throw new HttpError(409, 'INVENTORY_INVARIANT', 'Reserved inventory is no longer available; contact an operator');
      }
    }
    for (const item of items.rows) {
      await client.query('UPDATE products SET stock_quantity = stock_quantity - $2, updated_at = now() WHERE id = $1', [item.product_id, item.quantity]);
    }
    const updated = await client.query(
      `UPDATE orders SET status = 'picked_up', picked_up_at = clock_timestamp()
       WHERE id = $1 AND status = 'paid' RETURNING id, status, picked_up_at AS "pickedUpAt"`, [id],
    );
    if (!updated.rowCount) throw new HttpError(409, 'ORDER_NOT_READY', 'Order was already claimed');
    return updated.rows[0];
  });
}
