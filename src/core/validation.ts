import { ApiError } from './errors.ts';

const USERNAME_REGEX = /^[a-z0-9](?:[a-z0-9_-]{1,30}[a-z0-9])?$/;

export const validateUsername = (value: unknown): string => {
  if (typeof value !== 'string') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'username must be a string');
  }
  const normalized = value.trim().toLowerCase();
  if (!USERNAME_REGEX.test(normalized)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'username format is invalid');
  }
  return normalized;
};

export const validatePassword = (value: unknown): string => {
  if (typeof value !== 'string' || value.length < 8 || value.length > 256) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'password must be 8-256 chars');
  }
  return value;
};

export const validateSimplexUri = (value: unknown): string => {
  if (typeof value !== 'string') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'simplexUri must be a string');
  }
  const trimmed = value.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new ApiError(400, 'VALIDATION_ERROR', 'simplexUri format is invalid');
  }
  if (parsed.protocol !== 'https:') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'simplexUri must use https protocol');
  }
  if (trimmed.length > 2048) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'simplexUri is too long');
  }
  return trimmed;
};

export const validateTargetUri = (value: unknown): string => {
  if (typeof value !== 'string') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'target must be a string');
  }
  const trimmed = value.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new ApiError(400, 'VALIDATION_ERROR', 'target must be a valid absolute URI');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'target protocol must be http or https');
  }
  if (trimmed.length > 2048) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'target is too long');
  }
  return trimmed;
};

export const validateTld = (value: unknown): 'inco' | 'link' => {
  if (value === 'inco' || value === 'link') {
    return value;
  }
  throw new ApiError(400, 'VALIDATION_ERROR', 'tld must be inco or link');
};

export const parseJsonBody = async <T>(request: Request): Promise<T> => {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON');
  }
};
