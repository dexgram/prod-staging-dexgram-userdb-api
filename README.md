# Dexgram UserDB API (Cloudflare Workers + D1)

Public identifier resolution API with two domains:

- `.inco` append-only, immutable records
- `.link` password-protected mutable records with expiration and cron cleanup

## Routes

- `GET /health`
- `POST /v1/inco`
- `POST /v1/link`
- `GET /v1/resolve/:identifier`
- `PATCH /v1/link/:identifier`
- `DELETE /v1/link/:identifier`
- `POST /v1/link/:identifier/ping`

## D1 Migrations

- `migrations/inco/0001_init.sql`
- `migrations/link/0001_init.sql`

## Local checks

```bash
npm ci
npm run check
npm test
```
