import test from 'node:test';
import assert from 'node:assert/strict';

import { IncoRepository } from '../src/repositories/incoRepository.ts';

test('inco delete recovers from legacy no-delete trigger', async () => {
  let deleteAttempts = 0;
  let triggerDropped = false;

  const db = {
    prepare(query: string) {
      return {
        bind() {
          return this;
        },
        async run() {
          if (query.startsWith('DELETE FROM inco_identifiers WHERE identifier')) {
            deleteAttempts += 1;
            if (!triggerDropped) {
              throw new Error('inco_identifiers is append-only and cannot be deleted');
            }
            return { meta: { changes: 1 } };
          }

          if (query === 'DROP TRIGGER IF EXISTS tr_inco_no_delete') {
            triggerDropped = true;
            return { meta: { changes: 0 } };
          }

          throw new Error(`Unexpected query: ${query}`);
        },
      };
    },
  } as unknown as D1Database;

  const repo = new IncoRepository(db);
  const deleted = await repo.delete('alice.123.inco');

  assert.equal(deleted, true);
  assert.equal(deleteAttempts, 2);
  assert.equal(triggerDropped, true);
});

test('inco cleanup recovers from legacy no-delete trigger', async () => {
  let cleanupAttempts = 0;
  let triggerDropped = false;

  const db = {
    prepare(query: string) {
      return {
        bind() {
          return this;
        },
        async run() {
          if (query.startsWith('DELETE FROM inco_identifiers WHERE expires_at <= ?')) {
            cleanupAttempts += 1;
            if (!triggerDropped) {
              throw new Error('inco_identifiers is append-only and cannot be deleted');
            }
            return { meta: { changes: 4 } };
          }

          if (query === 'DROP TRIGGER IF EXISTS tr_inco_no_delete') {
            triggerDropped = true;
            return { meta: { changes: 0 } };
          }

          throw new Error(`Unexpected query: ${query}`);
        },
      };
    },
  } as unknown as D1Database;

  const repo = new IncoRepository(db);
  const changes = await repo.cleanupExpired(new Date().toISOString());

  assert.equal(changes, 4);
  assert.equal(cleanupAttempts, 2);
  assert.equal(triggerDropped, true);
});
