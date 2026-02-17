export interface LinkRecord {
  id: string;
  username: string;
  suffix: number;
  identifier: string;
  passwordHash: string;
  simplexUri: string;
  createdAt: string;
  expiresAt: string;
  lastPingAt: string;
}

export class LinkRepository {
  private readonly db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  async suffixExists(suffix: number): Promise<boolean> {
    const row = await this.db
      .prepare('SELECT 1 FROM link_identifiers WHERE suffix = ? LIMIT 1')
      .bind(suffix)
      .first<{ 1: number }>();
    return !!row;
  }

  async create(record: LinkRecord): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO link_identifiers
        (id, username, suffix, identifier, password_hash, simplex_uri, created_at, expires_at, last_ping_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        record.id,
        record.username,
        record.suffix,
        record.identifier,
        record.passwordHash,
        record.simplexUri,
        record.createdAt,
        record.expiresAt,
        record.lastPingAt,
      )
      .run();
  }

  async findByIdentifier(identifier: string): Promise<LinkRecord | null> {
    return (
      (await this.db
        .prepare(
          `SELECT id, username, suffix, identifier, password_hash as passwordHash,
            simplex_uri as simplexUri, created_at as createdAt, expires_at as expiresAt,
            last_ping_at as lastPingAt
           FROM link_identifiers WHERE identifier = ? LIMIT 1`,
        )
        .bind(identifier)
        .first<LinkRecord>()) ?? null
    );
  }

  async updateUri(identifier: string, simplexUri: string): Promise<boolean> {
    const result = await this.db
      .prepare('UPDATE link_identifiers SET simplex_uri = ? WHERE identifier = ?')
      .bind(simplexUri, identifier)
      .run();
    return result.meta.changes > 0;
  }

  async updateUsername(identifier: string, username: string, updatedIdentifier: string): Promise<boolean> {
    const result = await this.db
      .prepare('UPDATE link_identifiers SET username = ?, identifier = ? WHERE identifier = ?')
      .bind(username, updatedIdentifier, identifier)
      .run();
    return result.meta.changes > 0;
  }

  async delete(identifier: string): Promise<boolean> {
    const result = await this.db.prepare('DELETE FROM link_identifiers WHERE identifier = ?').bind(identifier).run();
    return result.meta.changes > 0;
  }

  async ping(identifier: string, expiresAt: string, pingAt: string): Promise<boolean> {
    const result = await this.db
      .prepare('UPDATE link_identifiers SET expires_at = ?, last_ping_at = ? WHERE identifier = ?')
      .bind(expiresAt, pingAt, identifier)
      .run();
    return result.meta.changes > 0;
  }

  async cleanupExpired(nowIso: string): Promise<number> {
    const result = await this.db
      .prepare('DELETE FROM link_identifiers WHERE expires_at <= ?')
      .bind(nowIso)
      .run();
    return result.meta.changes;
  }
}
