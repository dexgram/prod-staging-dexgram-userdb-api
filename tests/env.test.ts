import test from 'node:test';
import assert from 'node:assert/strict';

import { parseConfig, parseHmacSecret, type Env } from '../src/config/env.ts';

const baseEnv = (): Env => ({
  DB_INCO: {} as D1Database,
  DB_LINK: {} as D1Database,
  HMAC_SECRET: '',
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

test('parseConfig succeeds without HMAC_SECRET for inco routes', () => {
  const config = parseConfig(baseEnv());
  assert.equal(config.snowflakeInstanceId, 1);
  assert.equal(config.incoExpirationMinutes, 1440);
});

test('parseConfig accepts SNOWFLAKE_INSTANCE_ID set to 0', () => {
  const env = baseEnv();
  env.SNOWFLAKE_INSTANCE_ID = '0';

  const config = parseConfig(env);
  assert.equal(config.snowflakeInstanceId, 0);
});

test('parseConfig rejects SNOWFLAKE_INSTANCE_ID outside 0..1023', () => {
  const env = baseEnv();
  env.SNOWFLAKE_INSTANCE_ID = '2048';

  assert.throws(() => parseConfig(env), /Invalid SNOWFLAKE_INSTANCE_ID/);
});

test('parseHmacSecret rejects missing or short secrets', () => {
  assert.throws(() => parseHmacSecret(baseEnv()), /HMAC_SECRET must be set and at least 16 chars long/);

  const env = baseEnv();
  env.HMAC_SECRET = 'short';
  assert.throws(() => parseHmacSecret(env), /HMAC_SECRET must be set and at least 16 chars long/);
});

test('parseHmacSecret accepts strong secret', () => {
  const env = baseEnv();
  env.HMAC_SECRET = '1234567890abcdef';
  assert.equal(parseHmacSecret(env), '1234567890abcdef');
});
