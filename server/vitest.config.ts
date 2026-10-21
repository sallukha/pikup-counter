import { defineConfig } from 'vitest/config';

process.env.NODE_ENV = 'test';
process.env.TEST_DATABASE_URL ??= 'postgres://pickup:pickup_test_password@127.0.0.1:55433/pickup_counter_test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.PAYMENT_WEBHOOK_SECRET ??= 'test-webhook-secret-with-at-least-32-bytes';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    globalSetup: ['./tests/global-setup.ts'],
    testTimeout: 20_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
