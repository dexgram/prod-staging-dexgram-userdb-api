import test from 'node:test';
import assert from 'node:assert/strict';

import worker from '../src/index.ts';
import type { Env } from '../src/config/env.ts';

const buildEnv = (): Env => ({
  DB_INCO: {} as D1Database,
  DB_LINK: {} as D1Database,
  HMAC_SECRET: '1234567890abcdef',
  SNOWFLAKE_EPOCH: '2020-01-01T00:00:00Z',
  SNOWFLAKE_INSTANCE_ID: '1',
  CLEANUP_INTERVAL_SECONDS: '5',
  GENERAL_DOMAIN_EXPIRATION_MINUTES: '1440',
  PHONE_EXPIRATION_MINUTES: '30',
  LINK_DOMAIN_EXPIRATION_MINUTES: '60',
  MAX_USERNAME_SUFFIX_ATTEMPTS: '10',
  MIN_USERNAME_Z_VALUE: '10',
  MAX_USERNAME_Z_VALUE: '99',
});

test('returns 503 with SERVICE_MISCONFIGURED for invalid runtime config', async () => {
  const env = buildEnv();
  env.SNOWFLAKE_EPOCH = 'not-a-date';

  const response = await worker.fetch(
    new Request('https://example.com/v1/inco', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'alice', simplexUri: 'simplex://user#alice', tld: 'inco' }),
    }),
    env,
  );

  assert.equal(response.status, 503);
  const payload = (await response.json()) as { error: { code: string } };
  assert.equal(payload.error.code, 'SERVICE_MISCONFIGURED');
});

test('returns 503 with STORAGE_NOT_READY when D1 schema is unavailable', async () => {
  const env = buildEnv();
  env.DB_INCO = {
    prepare() {
      throw new Error('D1_ERROR: no such table: inco_identifiers');
    },
  } as unknown as D1Database;

  const response = await worker.fetch(
    new Request('https://example.com/v1/inco', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'alice', simplexUri: 'simplex://user#alice', tld: 'inco' }),
    }),
    env,
  );

  assert.equal(response.status, 503);
  const payload = (await response.json()) as { error: { code: string } };
  assert.equal(payload.error.code, 'STORAGE_NOT_READY');
});
