import { pool } from '../db/pool.js';

export async function listProducts() {
  const result = await pool.query(
    `SELECT p.id, p.name, p.description, p.category, p.price_paise AS "pricePaise",
       GREATEST(p.stock_quantity - COALESCE(SUM(oi.quantity) FILTER (
         WHERE (o.status = 'pending' AND o.expires_at > clock_timestamp()) OR o.status = 'paid'
       ), 0), 0)::int AS "availableUnits"
     FROM products p
     LEFT JOIN order_items oi ON oi.product_id = p.id
     LEFT JOIN orders o ON o.id = oi.order_id
     GROUP BY p.id
     ORDER BY p.name`,
  );
  return result.rows;
}
