import test from 'node:test';
import assert from 'node:assert/strict';

import { SnowflakeGenerator } from '../src/services/snowflake.ts';
import { allocateUniqueSuffix } from '../src/services/suffixAllocator.ts';
import { timingSafeEqualHex } from '../src/services/crypto.ts';

test('snowflake ids are monotonically increasing for equal timestamps', () => {
  const generator = new SnowflakeGenerator(Date.parse('2020-01-01T00:00:00Z'), 1);
  const id1 = generator.next(1_700_000_000_000);
  const id2 = generator.next(1_700_000_000_000);
  assert.ok(BigInt(id2) > BigInt(id1));
});

test('suffix allocator fails after max attempts', async () => {
  await assert.rejects(
    () =>
      allocateUniqueSuffix(
        { min: 10, max: 12, maxAttempts: 2 },
        async () => true,
      ),
    /SUFFIX_EXHAUSTED|Failed to allocate unique suffix/,
  );
});

test('timingSafeEqualHex compares deterministic strings', () => {
  assert.equal(timingSafeEqualHex('abcd', 'abcd'), true);
  assert.equal(timingSafeEqualHex('abcd', 'abce'), false);
  assert.equal(timingSafeEqualHex('abcd', 'abc'), false);
});
