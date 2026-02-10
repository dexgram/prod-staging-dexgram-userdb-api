PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS link_identifiers (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL CHECK(length(username) BETWEEN 3 AND 32),
  suffix INTEGER NOT NULL,
  identifier TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL CHECK(length(password_hash) = 64),
  simplex_uri TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_ping_at TEXT NOT NULL,
  CHECK(identifier = username || '.' || suffix || '.link'),
  CHECK(suffix >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_link_suffix_unique ON link_identifiers(suffix);
CREATE UNIQUE INDEX IF NOT EXISTS idx_link_identifier_unique ON link_identifiers(identifier);
CREATE INDEX IF NOT EXISTS idx_link_expires_at ON link_identifiers(expires_at);
