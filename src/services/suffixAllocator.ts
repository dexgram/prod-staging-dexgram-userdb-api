import { ApiError } from '../core/errors.ts';

export interface SuffixConfig {
  min: number;
  max: number;
  maxAttempts: number;
}

export type SuffixExistsFn = (suffix: number) => Promise<boolean>;

const randomInRange = (min: number, max: number): number => {
  const span = max - min + 1;
  const random = crypto.getRandomValues(new Uint32Array(1))[0] / (0xffffffff + 1);
  return min + Math.floor(random * span);
};

export const allocateUniqueSuffix = async (
  config: SuffixConfig,
  exists: SuffixExistsFn,
): Promise<number> => {
  for (let attempt = 1; attempt <= config.maxAttempts; attempt += 1) {
    const candidate = randomInRange(config.min, config.max);
    if (!(await exists(candidate))) {
      return candidate;
    }
  }

  throw new ApiError(409, 'SUFFIX_EXHAUSTED', 'Failed to allocate unique suffix', {
    attempts: config.maxAttempts,
    min: config.min,
    max: config.max,
  });
};
