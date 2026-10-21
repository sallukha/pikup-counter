# Pickup Counter

Pickup Counter is a snack ordering kiosk with a React client in `client/` and an Express, TypeScript, PostgreSQL API in `server/`. The client files are preserved as supplied. The backend API and test instructions below describe its current integration.

## Requirements

- Docker Desktop with Compose (recommended for PostgreSQL and one-command startup)
- Node.js 22 or later and npm 9 or later for local development

## Start everything with Docker

From the repository root:

```powershell
docker compose up --build
```

Compose starts PostgreSQL, waits for its health check, builds the backend, applies migrations and seed data, waits for the API health check, then starts Vite. Open <http://localhost:3000>. The PostgreSQL development data is persisted in the `pickup_counter_data` volume. The client source is mounted read-only; its npm dependencies live in a separate Docker volume.

The Compose file has local-development fallback credentials so this command works without a local `.env`. Set `POSTGRES_PASSWORD` and `PAYMENT_WEBHOOK_SECRET` in the shell or a root `.env` before using Compose beyond local development. The fallback webhook secret is only for local development and must never be used in a deployed environment. Secrets are passed at runtime and are not baked into the image.

Stop the stack with `docker compose down`. To reset the development database, run `docker compose down -v` (this removes its persisted data).

## Local development

Start PostgreSQL with Compose:

```powershell
docker compose up -d db
```

Create `server/.env` from `server/.env.example`, use a secret of at least 32 bytes, and install/run the API:

```powershell
cd server
npm ci
npm run db:migrate
npm run db:seed
npm run dev
```

In another terminal, run the client from `client/` with `npm ci` and `npm run dev`. Its Vite proxy currently points at `http://localhost:4000`. You may also configure its existing `VITE_API_BASE_URL` through `client/.env` or its API settings modal.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `PORT` | API listen port (default `4000`) |
| `DATABASE_URL` | PostgreSQL connection URL |
| `PAYMENT_WEBHOOK_SECRET` | Shared HMAC secret, at least 32 UTF-8 bytes |
| `CORS_ORIGINS` | Comma-separated browser origins; `*` is supported for local-only setups |
| `API_BASE_URL` | Webhook sender destination (default `http://localhost:4000`) |
| `POSTGRES_PASSWORD` | Compose development database password |
| `TEST_DATABASE_URL` | Dedicated integration test database URL; database name must be exactly `pickup_counter_test` |

There is no real `.env` file in the repository. Keep secrets in `server/.env` or your deployment secret manager, never in the client.

## Inventory model

`products.stock_quantity` is physical stock and is not decremented when an order is created or paid. Availability is computed from PostgreSQL as physical stock minus active holds: pending orders before their `expires_at`, plus paid orders awaiting pickup. Expired pending orders stop holding stock based on the database clock even if the cleanup worker has not updated their state. A five-second cleanup worker updates stale rows for clearer status reporting.

Order creation locks all requested product rows in sorted ID order, checks current active reservations, and inserts the order and item snapshots in one transaction. A hold lasts 120 seconds. Pickup locks the order and products, decrements physical stock, and changes the order to `picked_up` in one transaction. PostgreSQL order state and row locks serialize payment, expiry, and pickup transitions; no JavaScript memory lock is used.

## HTTP API

All errors have `{ "error": "...", "code": "..." }` shape.

### `GET /health`

Returns `200 { "status": "ok", "database": "ok" }` after checking the database. A database failure returns `500`.

### `GET /products`

Returns `{ "products": [...] }`. Each product includes `id`, `name`, `description`, `category`, integer `pricePaise`, and computed integer `availableUnits`.

### `POST /orders`

Request: `{ "items": [{ "productId": "prod-chips-salted", "quantity": 2 }] }`.

Success (`201`) returns `id`, `totalPaise`, `status: "pending"`, `expiresAt`, `createdAt`, and `expiresInSeconds`. Empty lists, invalid quantities, invalid IDs, duplicates, and unknown products fail with `400`/`404`; insufficient stock returns `409`. The whole order rolls back on any failure.

### `GET /orders/:id`

Returns `id`, `status`, `totalPaise`, `expiresAt`, `expiresInSeconds`, timestamps, `items` (with product ID, name snapshot, quantity, and unit `pricePaise`), plus `reviewReason` when relevant. Expired pending orders are reported as expired immediately.

### `POST /payments/webhook`

Requires an `application/json` raw body and `X-Signature` header containing lowercase or uppercase hex HMAC-SHA256 of those exact bytes. The secret comes from `PAYMENT_WEBHOOK_SECRET`. Invalid/missing signatures return `401`; invalid payloads return `400`; unknown orders return `404`. A first valid event returns `200`. Identical event ID and body replay returns `200` with `duplicate: true`; reusing an ID with a different body returns `409` and emits a sanitized log line. Captured amount mismatches return `200` and move the order to `needs_review`. Failed or unsupported event statuses are recorded without marking the order paid.

### `POST /orders/:id/pickup-claim`

Only a `paid` order can be claimed. The successful request returns `200` with `status: "picked_up"` and `pickedUpAt`; simultaneous or repeated claims lose with `409`. Unknown IDs return `404` and malformed UUIDs return `400`.

The client also has an optional cancellation call at `POST /orders/:id/cancel`. This API supports cancellation only for an active pending order; otherwise it returns `409`.

### Late payment decision

A captured payment arriving after reservation expiry does not take stock from another customer. The API records the event, changes the order to `needs_review` with `reviewReason: "captured_after_expiry"`, and leaves inventory unchanged. An operator must resolve it, for example by refunding it or explicitly making a safe reallocation. No automatic pickup is allowed for review orders.

## Webhook sender

Create an order through the app or API, copy its returned `id`, and send a captured event using the same secret configured on the server:

```powershell
cd server
npm run send-webhook -- --order-id YOUR_ORDER_UUID --amount-paise 4500 --event-id evt_test_123 --status captured
```

The script reads `PAYMENT_WEBHOOK_SECRET` and `API_BASE_URL` from the environment or `server/.env`, serializes the JSON once, signs those exact bytes, and prints the HTTP status/body. Never use a production secret for local testing.

## Migrations, seeding, and tests

Migrations are numbered SQL files tracked by name in `schema_migrations` and safe to rerun. The seed script inserts five sample products with `ON CONFLICT DO NOTHING`, preserving existing stock.

```powershell
cd server
npm ci
npm run db:migrate
npm run db:seed
npm test
```

`npm test` starts a separate PostgreSQL container through Compose on `127.0.0.1:55433`, verifies the database is named exactly `pickup_counter_test`, applies migrations, runs HTTP tests against PostgreSQL, then stops that test service. Test cleanup refuses to truncate unless the connected database has that exact name. Docker must be available. The suite covers ten concurrent orders for two units, duplicate delivery, concurrent pickup claims, bad signatures, mismatched amounts, expiration, insufficient stock, late payment, and event ID reuse. Test results are reported after execution; no passing result is assumed in advance.

## Frontend integration notes

The existing client calls `GET /products`, `POST /orders`, and `GET /orders/:id`; the response shapes above match its normalizers. Its Vite proxy forwards `/products` and `/orders` to port 4000. The client’s optional webhook tester is incompatible with the required security contract: it posts an unsigned payload to `/webhooks/payment`. The backend intentionally accepts only signed events at `/payments/webhook`; use the signed sender script or connect a real provider adapter. The client proxy does not currently forward `/payments`, and the assignment prohibits changing client files, so browser-side webhook testing needs a separate/manual client integration step.

## Known limits and next steps

This assignment backend has no operator authentication, payment provider, refund workflow, or durable review dashboard. The late-payment state is recorded for manual handling. A production deployment should supply provider key rotation, authenticated operator resolution, migrations as a dedicated release step, metrics/alerts, rate limits, and a production-grade secret manager. The repository's original top-level `server.ts` is preserved but is not used by this implementation; run the API from `server/` or Compose.
