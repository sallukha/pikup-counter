import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { processPaymentWebhook } from '../services/payment.service.js';

export const devPaymentRoutes = Router();

devPaymentRoutes.post('/payment', async (request, response, next) => {
  try {
    const body = request.body as Record<string, unknown> | undefined;
    if (!body || body.status !== 'paid') {
      response.status(400).json({ error: 'Development payment simulation requires status "paid"', code: 'INVALID_SIMULATION' });
      return;
    }

    const event = {
      eventId: `dev-${randomUUID()}`,
      orderId: body.orderId,
      amountPaise: body.amountPaise,
      status: 'captured',
    };
    response.json(await processPaymentWebhook(Buffer.from(JSON.stringify(event))));
  } catch (error) {
    next(error);
  }
});
