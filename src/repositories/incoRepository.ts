export interface IncoRecord {
  id: string;
  username: string;
  suffix: number;
  identifier: string;
  simplexUri: string;
  createdAt: string;
  expiresAt: string;
}

export class IncoRepository {
  private readonly db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  async suffixExists(suffix: number): Promise<boolean> {
    const row = await this.db
      .prepare('SELECT 1 FROM inco_identifiers WHERE suffix = ? LIMIT 1')
      .bind(suffix)
      .first<{ 1: number }>();
    return !!row;
  }

  async create(record: IncoRecord): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO inco_identifiers
        (id, username, suffix, identifier, simplex_uri, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        record.id,
        record.username,
        record.suffix,
        record.identifier,
        record.simplexUri,
        record.createdAt,
        record.expiresAt,
      )
      .run();
  }


  async cleanupExpired(nowIso: string): Promise<number> {
    const result = await this.db
      .prepare('DELETE FROM inco_identifiers WHERE expires_at <= ?')
      .bind(nowIso)
      .run();
    return result.meta.changes;
  }
  async findByIdentifier(identifier: string): Promise<IncoRecord | null> {
    return (
      (await this.db
        .prepare(
          `SELECT id, username, suffix, identifier, simplex_uri as simplexUri, created_at as createdAt, expires_at as expiresAt
           FROM inco_identifiers WHERE identifier = ? LIMIT 1`,
        )
        .bind(identifier)
        .first<IncoRecord>()) ?? null
    );
  }
}
