import type { RequestHandler } from 'express';

export const notFound: RequestHandler = (request, response) => {
  response.status(404).json({ error: `Route ${request.method} ${request.path} was not found`, code: 'NOT_FOUND' });
};
