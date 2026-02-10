import test from 'node:test';
import assert from 'node:assert/strict';

import { allocateUniqueSuffix } from '../src/services/suffixAllocator.ts';
import { timingSafeEqualHex } from '../src/services/crypto.ts';
import { validateSimplexUri, validateTargetUri } from '../src/core/validation.ts';

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


test('validateTargetUri accepts https targets', () => {
  assert.equal(validateTargetUri('https://example.com/profile/alice'), 'https://example.com/profile/alice');
});

test('validateTargetUri rejects non-http protocols', () => {
  assert.throws(() => validateTargetUri('ftp://example.com/file'), /target protocol must be http or https/);
});

test('validateSimplexUri accepts https uris', () => {
  assert.equal(validateSimplexUri('https://example.com/user/alice'), 'https://example.com/user/alice');
});

test('validateSimplexUri rejects simplex scheme', () => {
  assert.throws(() => validateSimplexUri('simplex://user#alice'), /simplexUri must use https protocol/);
});
