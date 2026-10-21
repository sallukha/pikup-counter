import { createHmac, timingSafeEqual } from 'node:crypto';

export function signBody(rawBody: Buffer | string, secret: string): string {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}

export function isValidSignature(rawBody: Buffer, supplied: unknown, secret: string): supplied is string {
  if (typeof supplied !== 'string' || !/^[a-f0-9]{64}$/i.test(supplied)) return false;
  const expectedBytes = Buffer.from(signBody(rawBody, secret), 'hex');
  const suppliedBytes = Buffer.from(supplied, 'hex');
  return suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes);
}
