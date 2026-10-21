import { pool } from '../src/db/pool.js';

const products = [
  ['prod-chips-salted', 'Artisan Potato Chips', 'Sea salt kettle-cooked crisps.', 'Chips & Crisps', 2000, 14],
  ['prod-masala-peanuts', 'Spicy Masala Peanuts', 'Roasted peanuts with chili and cumin.', 'Peanuts & Nuts', 1500, 18],
  ['prod-dark-chocolate', 'Dark Chocolate Bar (70%)', 'Dark chocolate with roasted cocoa nibs.', 'Sweets & Chocolates', 4000, 8],
  ['prod-sparkling-soda', 'Chilled Sparkling Lime Soda', 'Sparkling lime botanical soda.', 'Beverages', 3000, 12],
  ['prod-roasted-cashews', 'Roasted Pepper Cashews', 'Jumbo cashews with black pepper.', 'Peanuts & Nuts', 5000, 5],
] as const;

try {
  for (const [id, name, description, category, pricePaise, stock] of products) {
    await pool.query(
      `INSERT INTO products(id, name, description, category, price_paise, stock_quantity)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
      [id, name, description, category, pricePaise, stock],
    );
  }
  console.log(`Seeded ${products.length} starter products (existing rows preserved).`);
} finally {
  await pool.end();
}
