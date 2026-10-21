import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { pool } from './db/pool.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFound } from './middleware/not-found.js';
import { orderRoutes } from './routes/order.routes.js';
import { paymentRoutes } from './routes/payment.routes.js';
import { productRoutes } from './routes/product.routes.js';
import { isValidSignature } from './utils/webhook-signature.js';
import { HttpError } from './types/errors.js';

export const app = express();

function isLocalDevelopmentOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    return env.nodeEnv !== 'production'
      && ['http:', 'https:'].includes(parsed.protocol)
      && ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)
      && parsed.origin === origin;
  } catch {
    return false;
  }
}

app.disable('x-powered-by');
app.use(cors({
  origin(origin, callback) {
    if (!origin || env.corsOrigins.includes('*') || env.corsOrigins.includes(origin) || isLocalDevelopmentOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(new HttpError(403, 'CORS_ORIGIN_DENIED', 'Origin is not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Signature'],
}));

// This route must receive raw bytes; parsing JSON first would invalidate HMAC verification.
app.use('/payments/webhook', express.raw({ type: 'application/json', limit: '32kb' }), (request, response, next) => {
  if (!Buffer.isBuffer(request.body)) {
    response.status(415).json({ error: 'Webhook requires application/json', code: 'UNSUPPORTED_MEDIA_TYPE' });
    return;
  }
  if (!isValidSignature(request.body, request.header('X-Signature'), env.webhookSecret)) {
    response.status(401).json({ error: 'Webhook signature is missing or invalid', code: 'INVALID_SIGNATURE' });
    return;
  }
  next();
});

app.use(express.json({ limit: '32kb', strict: true }));

app.get('/health', async (_request, response, next) => {
  try {
    await pool.query('SELECT 1');
    response.json({ status: 'ok', database: 'ok' });
  } catch (error) {
    next(error);
  }
});
app.use('/products', productRoutes);
app.use('/orders', orderRoutes);
app.use('/payments/webhook', paymentRoutes);
app.use(notFound);
app.use(errorHandler);
