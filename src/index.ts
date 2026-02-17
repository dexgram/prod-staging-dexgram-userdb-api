import { parseConfig, parseHmacSecret, type AppConfig, type Env } from './config/env.ts';
import { ApiError, errorResponse } from './core/errors.ts';
import {
  parseJsonBody,
  validatePassword,
  validateSimplexUri,
  validateTargetUri,
  validateTld,
  validateUsername,
} from './core/validation.ts';
import { rateLimitHook } from './http/rateLimit.ts';
import { IncoRepository } from './repositories/incoRepository.ts';
import { LinkRepository } from './repositories/linkRepository.ts';
import { hmacSha256Hex, timingSafeEqualHex } from './services/crypto.ts';
import { allocateUniqueSuffix } from './services/suffixAllocator.ts';

interface CreateIncoBody { username: unknown; simplexUri: unknown; tld: unknown }
interface CreateLinkBody {
  username?: unknown;
  password: unknown;
  simplexUri?: unknown;
  tld?: unknown;
  payload?: { target?: unknown };
  ttlSeconds?: unknown;
}
interface PasswordBody { password: unknown }
interface UpdateLinkBody extends PasswordBody {
  simplexUri?: unknown;
  payload?: { target?: unknown };
}
interface UpdateLinkUsernameBody extends PasswordBody {
  username: unknown;
}

const DEFAULT_LINK_USERNAME = 'link';

const parseLinkTarget = (body: { simplexUri?: unknown; payload?: { target?: unknown } }): string => {
  if (body.payload?.target !== undefined) {
    return validateTargetUri(body.payload.target);
  }
  return validateSimplexUri(body.simplexUri);
};

const minutesToIso = (minutes: number, from = Date.now()): string => new Date(from + minutes * 60_000).toISOString();

const getPath = (url: URL): string => url.pathname.replace(/\/+$/, '') || '/';

const response = (payload: unknown, status = 200): Response =>
  Response.json(payload, { status, headers: { 'cache-control': 'no-store' } });

const assertTld = (identifier: string, expected: 'inco' | 'link'): void => {
  const parts = identifier.split('.');
  if (parts.length !== 3 || parts[2] !== expected) {
    throw new ApiError(400, 'VALIDATION_ERROR', `identifier must match <username>.<number>.${expected}`);
  }
};

const authenticateLink = async (
  repo: LinkRepository,
  identifier: string,
  password: string,
  secret: string,
): Promise<void> => {
  const record = await repo.findByIdentifier(identifier);
  if (!record) {
    throw new ApiError(404, 'NOT_FOUND', 'Identifier was not found');
  }
  if (new Date(record.expiresAt).getTime() <= Date.now()) {
    throw new ApiError(410, 'EXPIRED', 'Identifier has expired');
  }
  const computedHash = await hmacSha256Hex(secret, password);
  if (!timingSafeEqualHex(computedHash, record.passwordHash)) {
    throw new ApiError(401, 'AUTH_FAILED', 'Invalid credentials');
  }
};

const handleFetch = async (request: Request, env: Env): Promise<Response> => {
  const requestId = crypto.randomUUID();
  const url = new URL(request.url);
  const path = getPath(url);

  let config: AppConfig | null = null;
  const getConfig = (): AppConfig => {
    config ??= parseConfig(env);
    return config;
  };

  await rateLimitHook({
    path,
    method: request.method,
    ip: request.headers.get('CF-Connecting-IP') ?? '0.0.0.0',
  });

  const incoRepo = new IncoRepository(env.DB_INCO);
  const linkRepo = new LinkRepository(env.DB_LINK);

  if (path === '/health' && request.method === 'GET') {
    return response({ ok: true, requestId, timestamp: new Date().toISOString() });
  }

  if (path === '/v1/inco' && request.method === 'POST') {
    const body = await parseJsonBody<CreateIncoBody>(request);
    const config = getConfig();
    const username = validateUsername(body.username);
    const simplexUri = validateSimplexUri(body.simplexUri);
    validateTld(body.tld);
    if (body.tld !== 'inco') {
      throw new ApiError(400, 'VALIDATION_ERROR', 'tld must be inco');
    }

    const suffix = await allocateUniqueSuffix(
      { min: config.minSuffix, max: config.maxSuffix, maxAttempts: config.maxSuffixAttempts },
      (candidate) => incoRepo.suffixExists(candidate),
    );

    const identifier = `${username}.${suffix}.inco`;
    const now = new Date().toISOString();
    await incoRepo.create({
      id: crypto.randomUUID(),
      username,
      suffix,
      identifier,
      simplexUri,
      createdAt: now,
      expiresAt: minutesToIso(config.incoExpirationMinutes),
    });

    return response({ success: true, data: { username: identifier } }, 201);
  }

  if (path === '/v1/link' && request.method === 'POST') {
    const body = await parseJsonBody<CreateLinkBody>(request);
    const config = getConfig();
    const hmacSecret = parseHmacSecret(env);
    const username = body.username === undefined ? DEFAULT_LINK_USERNAME : validateUsername(body.username);
    const password = validatePassword(body.password);
    const simplexUri = parseLinkTarget(body);
    const tld = body.tld === undefined ? 'link' : validateTld(body.tld);
    if (tld !== 'link') {
      throw new ApiError(400, 'VALIDATION_ERROR', 'tld must be link');
    }

    const suffix = await allocateUniqueSuffix(
      { min: config.minSuffix, max: config.maxSuffix, maxAttempts: config.maxSuffixAttempts },
      (candidate) => linkRepo.suffixExists(candidate),
    );
    const identifier = `${username}.${suffix}.link`;
    const now = new Date().toISOString();
    await linkRepo.create({
      id: crypto.randomUUID(),
      username,
      suffix,
      identifier,
      passwordHash: await hmacSha256Hex(hmacSecret, password),
      simplexUri,
      createdAt: now,
      expiresAt: minutesToIso(config.linkExpirationMinutes),
      lastPingAt: now,
    });

    return response({ success: true, data: { username: identifier } }, 201);
  }

  if (path.startsWith('/v1/resolve/') && request.method === 'GET') {
    const identifier = decodeURIComponent(path.replace('/v1/resolve/', ''));
    const tld = identifier.split('.').at(-1);
    if (tld === 'inco') {
      const record = await incoRepo.findByIdentifier(identifier);
      if (!record) {
        throw new ApiError(404, 'NOT_FOUND', 'Identifier was not found');
      }
      if (new Date(record.expiresAt).getTime() <= Date.now()) {
        await incoRepo.delete(identifier);
        throw new ApiError(404, 'NOT_FOUND', 'Identifier was not found');
      }
      return response({ success: true, data: { address: record.simplexUri } });
    }
    if (tld === 'link') {
      const record = await linkRepo.findByIdentifier(identifier);
      if (!record) {
        throw new ApiError(404, 'NOT_FOUND', 'Identifier was not found');
      }
      if (new Date(record.expiresAt).getTime() <= Date.now()) {
        await linkRepo.delete(identifier);
        throw new ApiError(404, 'NOT_FOUND', 'Identifier was not found');
      }
      return response({ success: true, data: { address: record.simplexUri } });
    }
    throw new ApiError(400, 'VALIDATION_ERROR', 'Unknown identifier tld');
  }

  if (path.startsWith('/v1/inco/') && (request.method === 'PUT' || request.method === 'PATCH' || request.method === 'DELETE')) {
    throw new ApiError(405, 'IMMUTABLE_DOMAIN', '.inco identifiers are immutable and append-only');
  }

  if (path.startsWith('/v1/link/') && request.method === 'PATCH') {
    if (path.endsWith('/username')) {
      const identifier = decodeURIComponent(path.replace('/v1/link/', '').replace('/username', ''));
      assertTld(identifier, 'link');
      const body = await parseJsonBody<UpdateLinkUsernameBody>(request);
      const password = validatePassword(body.password);
      const username = validateUsername(body.username);
      await authenticateLink(linkRepo, identifier, password, parseHmacSecret(env));

      const currentSuffix = Number.parseInt(identifier.split('.')[1] ?? '', 10);
      const updatedIdentifier = `${username}.${currentSuffix}.link`;
      const existingRecord = await linkRepo.findByIdentifier(updatedIdentifier);
      if (existingRecord && updatedIdentifier !== identifier) {
        throw new ApiError(409, 'IDENTIFIER_TAKEN', 'Requested username is unavailable for this suffix');
      }

      await linkRepo.updateUsername(identifier, username, updatedIdentifier);
      return response({ previousId: identifier, id: updatedIdentifier, requestId });
    }

    const identifier = decodeURIComponent(path.replace('/v1/link/', ''));
    assertTld(identifier, 'link');
    const body = await parseJsonBody<UpdateLinkBody>(request);
    const password = validatePassword(body.password);
    const simplexUri = parseLinkTarget(body);
    await authenticateLink(linkRepo, identifier, password, parseHmacSecret(env));
    await linkRepo.updateUri(identifier, simplexUri);
    return response({ id: identifier, simplexUri, requestId });
  }

  if (path.startsWith('/v1/link/') && request.method === 'DELETE') {
    const identifier = decodeURIComponent(path.replace('/v1/link/', ''));
    assertTld(identifier, 'link');
    const body = await parseJsonBody<PasswordBody>(request);
    const password = validatePassword(body.password);
    await authenticateLink(linkRepo, identifier, password, parseHmacSecret(env));
    await linkRepo.delete(identifier);
    return response({ id: identifier, deleted: true, requestId });
  }

  if (path.startsWith('/v1/link/') && path.endsWith('/ping') && request.method === 'POST') {
    const identifier = decodeURIComponent(path.replace('/v1/link/', '').replace('/ping', ''));
    assertTld(identifier, 'link');
    const body = await parseJsonBody<PasswordBody>(request);
    const password = validatePassword(body.password);
    const config = getConfig();
    await authenticateLink(linkRepo, identifier, password, parseHmacSecret(env));
    const now = new Date().toISOString();
    const expiresAt = minutesToIso(config.linkExpirationMinutes);
    await linkRepo.ping(identifier, expiresAt, now);
    return response({ id: identifier, expiresAt, requestId });
  }

  throw new ApiError(404, 'ROUTE_NOT_FOUND', 'Route not found');
};

const handleScheduled = async (_controller: ScheduledController, env: Env): Promise<void> => {
  const now = new Date().toISOString();
  const incoRepo = new IncoRepository(env.DB_INCO);
  const linkRepo = new LinkRepository(env.DB_LINK);
  await Promise.all([
    incoRepo.cleanupExpired(now),
    linkRepo.cleanupExpired(now),
  ]);
};

const mapUnhandledError = (error: unknown): ApiError => {
  const message = (error as Error | undefined)?.message ?? 'Unknown error';

  if (
    message.includes('HMAC_SECRET')
    || message.includes('MIN_USERNAME_Z_VALUE')
    || message.includes('MAX_USERNAME_Z_VALUE')
    || message.includes('Invalid positive integer')
  ) {
    return new ApiError(503, 'SERVICE_MISCONFIGURED', 'Service is temporarily misconfigured');
  }

  if (
    message.includes('no such table')
    || message.includes('no such column')
    || message.includes('D1_ERROR')
    || message.includes('database is locked')
  ) {
    return new ApiError(503, 'STORAGE_NOT_READY', 'Storage backend is unavailable');
  }

  return new ApiError(500, 'INTERNAL_ERROR', 'Unexpected server error');
};

export default {
  async fetch(request, env): Promise<Response> {
    const requestId = crypto.randomUUID();
    try {
      return await handleFetch(request, env);
    } catch (error) {
      if (error instanceof ApiError) {
        return errorResponse(error, requestId);
      }
      console.error('Unhandled error', { requestId, message: (error as Error)?.message });
      return errorResponse(mapUnhandledError(error), requestId);
    }
  },
  async scheduled(controller, env): Promise<void> {
    await handleScheduled(controller, env);
  },
} satisfies ExportedHandler<Env>;
