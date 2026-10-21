import { pool } from '../../src/db/pool.js';

export async function resetTestDatabase() {
  const result = await pool.query<{ name: string }>('SELECT current_database() AS name');
  if (result.rows[0]?.name !== 'pickup_counter_test') {
    throw new Error(`Refusing destructive test cleanup in database ${result.rows[0]?.name ?? 'unknown'}`);
  }
  await pool.query('TRUNCATE payment_events, order_items, orders, products CASCADE');
  await pool.query(
    `INSERT INTO products(id, name, description, category, price_paise, stock_quantity)
     VALUES ('test-snack', 'Test Snack', 'Test fixture', 'Test', 4500, 2)`,
  );
}
