PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS inco_identifiers (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL CHECK(length(username) BETWEEN 3 AND 32),
  suffix INTEGER NOT NULL,
  identifier TEXT NOT NULL UNIQUE,
  simplex_uri TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  CHECK(identifier = username || '.' || suffix || '.inco'),
  CHECK(suffix >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_inco_suffix_unique ON inco_identifiers(suffix);
CREATE UNIQUE INDEX IF NOT EXISTS idx_inco_identifier_unique ON inco_identifiers(identifier);

CREATE TRIGGER IF NOT EXISTS tr_inco_no_update
BEFORE UPDATE ON inco_identifiers
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'inco_identifiers is immutable and cannot be updated');
END;

CREATE TRIGGER IF NOT EXISTS tr_inco_no_delete
BEFORE DELETE ON inco_identifiers
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'inco_identifiers is append-only and cannot be deleted');
END;
