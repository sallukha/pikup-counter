CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Snack',
  price_paise integer NOT NULL CHECK (price_paise >= 0),
  stock_quantity integer NOT NULL CHECK (stock_quantity >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'expired', 'needs_review', 'picked_up', 'cancelled')),
  total_paise integer NOT NULL CHECK (total_paise >= 0),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  picked_up_at timestamptz,
  review_reason text,
  CHECK (status <> 'picked_up' OR picked_up_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS orders_active_reservations_idx
  ON orders (expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS orders_paid_reservations_idx
  ON orders (created_at) WHERE status = 'paid';

CREATE TABLE IF NOT EXISTS order_items (
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES products(id),
  product_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price_paise integer NOT NULL CHECK (unit_price_paise >= 0),
  PRIMARY KEY (order_id, product_id)
);

CREATE INDEX IF NOT EXISTS order_items_product_idx ON order_items(product_id);

CREATE TABLE IF NOT EXISTS payment_events (
  event_id text PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES orders(id),
  amount_paise integer NOT NULL CHECK (amount_paise >= 0),
  status text NOT NULL,
  payload_hash text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_events_order_idx ON payment_events(order_id);
