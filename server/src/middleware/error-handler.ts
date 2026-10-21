import type { ErrorRequestHandler } from 'express';
import { HttpError } from '../types/errors.js';

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof HttpError) {
    response.status(error.status).json({ error: error.message, code: error.code });
    return;
  }
  if (error instanceof SyntaxError && 'body' in error) {
    response.status(400).json({ error: 'Malformed JSON request body', code: 'INVALID_JSON' });
    return;
  }
  if (error && typeof error === 'object' && 'status' in error && (error as { status?: unknown }).status === 413) {
    response.status(413).json({ error: 'Request body exceeds the 32 KB limit', code: 'BODY_TOO_LARGE' });
    return;
  }
  console.error('Unhandled request error:', error instanceof Error ? error.message : 'unknown error');
  response.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
};
