import { Router } from 'express';
import { listProducts } from '../services/product.service.js';

export const productRoutes = Router();
productRoutes.get('/', async (_request, response, next) => {
  try {
    response.json({ products: await listProducts() });
  } catch (error) {
    next(error);
  }
});
