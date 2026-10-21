import { Router } from 'express';
import { processPaymentWebhook } from '../services/payment.service.js';

export const paymentRoutes = Router();
paymentRoutes.post('/', async (request, response, next) => {
  try {
    if (!Buffer.isBuffer(request.body)) {
      response.status(415).json({ error: 'Webhook requires application/json', code: 'UNSUPPORTED_MEDIA_TYPE' });
      return;
    }
    response.json(await processPaymentWebhook(request.body));
  } catch (error) {
    next(error);
  }
});
