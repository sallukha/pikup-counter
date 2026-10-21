import { Router } from 'express';
import { cancelOrder, claimPickup, createOrder, getOrder } from '../services/order.service.js';

export const orderRoutes = Router();

orderRoutes.post('/', async (request, response, next) => {
  try {
    response.status(201).json(await createOrder(request.body as unknown));
  } catch (error) {
    next(error);
  }
});

orderRoutes.get('/:id', async (request, response, next) => {
  try {
    response.json(await getOrder(request.params.id));
  } catch (error) {
    next(error);
  }
});

orderRoutes.post('/:id/cancel', async (request, response, next) => {
  try {
    response.json(await cancelOrder(request.params.id));
  } catch (error) {
    next(error);
  }
});

orderRoutes.post('/:id/pickup-claim', async (request, response, next) => {
  try {
    response.json(await claimPickup(request.params.id));
  } catch (error) {
    next(error);
  }
});
