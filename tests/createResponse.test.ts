import test from 'node:test';
import assert from 'node:assert/strict';

import worker from '../src/index.ts';
import type { Env } from '../src/config/env.ts';

const buildEnv = (): Env => ({
  DB_INCO: {} as D1Database,
  DB_LINK: {} as D1Database,
  HMAC_SECRET: '1234567890abcdef',
  CLEANUP_INTERVAL_SECONDS: '5',
  INCO_DOMAIN_EXPIRATION_MINUTES: '1440',
  PHONE_EXPIRATION_MINUTES: '30',
  LINK_DOMAIN_EXPIRATION_MINUTES: '60',
  MAX_USERNAME_SUFFIX_ATTEMPTS: '10',
  MIN_USERNAME_Z_VALUE: '7884',
  MAX_USERNAME_Z_VALUE: '7884',
});

test('create inco returns simplified success payload', async () => {
  const env = buildEnv();

  env.DB_INCO = {
    prepare(query: string) {
      if (query.includes('SELECT 1 FROM inco_identifiers WHERE suffix = ?')) {
        return {
          bind() {
            return {
              async first() {
                return null;
              },
            };
          },
        };
      }

      if (query.includes('INSERT INTO inco_identifiers')) {
        return {
          bind() {
            return {
              async run() {
                return { success: true };
              },
            };
          },
        };
      }

      throw new Error(`Unexpected query: ${query}`);
    },
  } as unknown as D1Database;

  const response = await worker.fetch(
    new Request('https://example.com/v1/inco', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'alice', simplexUri: 'https://example.com/user/alice', tld: 'inco' }),
    }),
    env,
  );

  assert.equal(response.status, 201);
  const payload = (await response.json()) as {
    success: boolean;
    data: { username: string };
  };
  assert.deepEqual(payload, {
    success: true,
    data: {
      username: 'alice.7884.inco',
    },
  });
});

test('create link returns simplified success payload', async () => {
  const env = buildEnv();

  env.DB_LINK = {
    prepare(query: string) {
      if (query.includes('SELECT 1 FROM link_identifiers WHERE suffix = ?')) {
        return {
          bind() {
            return {
              async first() {
                return null;
              },
            };
          },
        };
      }

      if (query.includes('INSERT INTO link_identifiers')) {
        return {
          bind() {
            return {
              async run() {
                return { success: true };
              },
            };
          },
        };
      }

      throw new Error(`Unexpected query: ${query}`);
    },
  } as unknown as D1Database;

  const response = await worker.fetch(
    new Request('https://example.com/v1/link', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username: 'alice',
        password: 'supersafe123',
        simplexUri: 'https://example.com/user/alice',
        tld: 'link',
      }),
    }),
    env,
  );

  assert.equal(response.status, 201);
  const payload = (await response.json()) as {
    success: boolean;
    data: { username: string };
  };
  assert.deepEqual(payload, {
    success: true,
    data: {
      username: 'alice.7884.link',
    },
  });
});
