import { ApiError } from '../core/errors.ts';

export interface RateLimitContext {
  path: string;
  method: string;
  ip: string;
}

// Hook point for durable-object/KV based rate limiting in production.
export const rateLimitHook = async (_context: RateLimitContext): Promise<void> => {
  const blocked = false;
  if (blocked) {
    throw new ApiError(429, 'RATE_LIMITED', 'Too many requests');
  }
};
