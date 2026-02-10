DROP TRIGGER IF EXISTS tr_inco_no_delete;

CREATE INDEX IF NOT EXISTS idx_inco_expires_at ON inco_identifiers(expires_at);
