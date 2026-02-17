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

test('update link username updates identifier and keeps suffix', async () => {
  const env = buildEnv();
  const passwordHash = 'd5224b7a35e3ea5bee05636b9f8adfb27bf38a8bc66b9ea5e9717f294f14e0bf';

  env.DB_LINK = {
    prepare(query: string) {
      if (query.includes('FROM link_identifiers WHERE identifier = ? LIMIT 1')) {
        return {
          bind(identifier: string) {
            return {
              async first() {
                if (identifier === 'alice.11.link') {
                  return {
                    id: 'id-1',
                    username: 'alice',
                    suffix: 11,
                    identifier,
                    passwordHash,
                    simplexUri: 'https://example.com/u/alice',
                    createdAt: '2026-02-16T19:35:03.762Z',
                    expiresAt: new Date(Date.now() + 60_000).toISOString(),
                    lastPingAt: '2026-02-16T19:35:03.762Z',
                  };
                }
                return null;
              },
            };
          },
        };
      }

      if (query.includes('UPDATE link_identifiers SET username = ?, identifier = ? WHERE identifier = ?')) {
        return {
          bind(username: string, updatedIdentifier: string, currentIdentifier: string) {
            return {
              async run() {
                assert.equal(username, 'bob');
                assert.equal(updatedIdentifier, 'bob.11.link');
                assert.equal(currentIdentifier, 'alice.11.link');
                return { meta: { changes: 1 } };
              },
            };
          },
        };
      }

      throw new Error(`Unexpected query: ${query}`);
    },
  } as unknown as D1Database;

  const response = await worker.fetch(
    new Request('https://example.com/v1/link/alice.11.link/username', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: 'my-password', username: 'bob' }),
    }),
    env,
  );

  assert.equal(response.status, 200);
  const payload = (await response.json()) as { previousId: string; id: string };
  assert.equal(payload.previousId, 'alice.11.link');
  assert.equal(payload.id, 'bob.11.link');
});
