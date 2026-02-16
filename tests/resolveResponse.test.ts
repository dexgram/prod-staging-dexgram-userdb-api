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
  MIN_USERNAME_Z_VALUE: '10',
  MAX_USERNAME_Z_VALUE: '99',
});

test('resolve endpoint returns simplified response payload', async () => {
  const future = new Date(Date.now() + 60_000).toISOString();
  const env = buildEnv();
  env.DB_INCO = {
    prepare(query: string) {
      return {
        bind(identifier: string) {
          return {
            async first() {
              if (!query.includes('FROM inco_identifiers WHERE identifier = ?')) {
                throw new Error(`Unexpected query: ${query}`);
              }
              if (identifier !== 'alice.7999.inco') {
                return null;
              }
              return {
                id: 'id-1',
                username: 'alice',
                suffix: 7999,
                identifier,
                simplexUri: 'https://example.com/user/alice',
                createdAt: '2026-02-16T19:35:03.762Z',
                expiresAt: future,
              };
            },
          };
        },
      };
    },
  } as unknown as D1Database;

  const response = await worker.fetch(
    new Request('https://example.com/v1/resolve/alice.7999.inco', { method: 'GET' }),
    env,
  );

  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    success: boolean;
    data: { address: string };
  };
  assert.deepEqual(payload, {
    success: true,
    data: {
      address: 'https://example.com/user/alice',
    },
  });
});
