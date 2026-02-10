export interface Env {
  DB_INCO: D1Database;
  DB_LINK: D1Database;
  HMAC_SECRET: string;
  SNOWFLAKE_EPOCH: string;
  SNOWFLAKE_INSTANCE_ID: string;
  CLEANUP_INTERVAL_SECONDS: string;
  GENERAL_DOMAIN_EXPIRATION_MINUTES: string;
  PHONE_EXPIRATION_MINUTES: string;
  LINK_DOMAIN_EXPIRATION_MINUTES: string;
  MAX_USERNAME_SUFFIX_ATTEMPTS: string;
  MIN_USERNAME_Z_VALUE: string;
  MAX_USERNAME_Z_VALUE: string;
  INCO_DOMAIN_EXPIRATION_MINUTES?: string;
}

export interface AppConfig {
  snowflakeEpochMs: number;
  snowflakeInstanceId: number;
  cleanupIntervalSeconds: number;
  incoExpirationMinutes: number;
  linkExpirationMinutes: number;
  maxSuffixAttempts: number;
  minSuffix: number;
  maxSuffix: number;
}

const parsePositiveInt = (name: string, raw: string): number => {
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid positive integer for ${name}`);
  }
  return value;
};

export const parseConfig = (env: Env): AppConfig => {
  const epoch = Date.parse(env.SNOWFLAKE_EPOCH);
  if (!Number.isFinite(epoch)) {
    throw new Error('Invalid SNOWFLAKE_EPOCH');
  }

  const minSuffix = parsePositiveInt('MIN_USERNAME_Z_VALUE', env.MIN_USERNAME_Z_VALUE);
  const maxSuffix = parsePositiveInt('MAX_USERNAME_Z_VALUE', env.MAX_USERNAME_Z_VALUE);
  if (minSuffix > maxSuffix) {
    throw new Error('MIN_USERNAME_Z_VALUE cannot be greater than MAX_USERNAME_Z_VALUE');
  }

  return {
    snowflakeEpochMs: epoch,
    snowflakeInstanceId: parsePositiveInt('SNOWFLAKE_INSTANCE_ID', env.SNOWFLAKE_INSTANCE_ID),
    cleanupIntervalSeconds: parsePositiveInt('CLEANUP_INTERVAL_SECONDS', env.CLEANUP_INTERVAL_SECONDS),
    incoExpirationMinutes: parsePositiveInt(
      'INCO_DOMAIN_EXPIRATION_MINUTES/GENERAL_DOMAIN_EXPIRATION_MINUTES',
      env.INCO_DOMAIN_EXPIRATION_MINUTES ?? env.GENERAL_DOMAIN_EXPIRATION_MINUTES,
    ),
    linkExpirationMinutes: parsePositiveInt('LINK_DOMAIN_EXPIRATION_MINUTES', env.LINK_DOMAIN_EXPIRATION_MINUTES),
    maxSuffixAttempts: parsePositiveInt('MAX_USERNAME_SUFFIX_ATTEMPTS', env.MAX_USERNAME_SUFFIX_ATTEMPTS),
    minSuffix,
    maxSuffix,
  };
};

export const parseHmacSecret = (env: Env): string => {
  if (!env.HMAC_SECRET || env.HMAC_SECRET.trim().length < 16) {
    throw new Error('HMAC_SECRET must be set and at least 16 chars long');
  }
  return env.HMAC_SECRET;
};
