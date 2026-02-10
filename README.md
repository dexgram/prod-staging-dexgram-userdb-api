# Dexgram UserDB API (Cloudflare Workers + D1)

Public identifier resolution API with two domains:

- `.inco` append-only, immutable records
- `.link` password-protected mutable records with expiration and cron cleanup

## Base URL

Use your deployed Worker URL (or local dev URL):

```bash
# Local Wrangler dev
export API_BASE_URL="http://127.0.0.1:8787"

# Example production URL
# export API_BASE_URL="https://dexgram-userdb-api.<your-account>.workers.dev"
```

## Endpoints with concrete `curl` examples

### 1) Health check

`GET /health`

```bash
curl -i "$API_BASE_URL/health"
```

Expected:

- `200 OK`
- JSON body indicating the API is alive

---

### 2) Create an immutable `.inco` record

`POST /v1/inco`

```bash
curl -i -X POST "$API_BASE_URL/v1/inco" \
  -H "content-type: application/json" \
  -d '{
    "owner": "did:key:z6MktExampleOwner",
    "payload": {
      "displayName": "alice",
      "pubkey": "ed25519:9f5b..."
    }
  }'
```

Expected:

- `201 Created`
- JSON containing the generated identifier ending with `.inco`

---

### 3) Create a mutable `.link` record (password-protected)

`ttlSeconds` is server-managed from Wrangler config (`LINK_DOMAIN_EXPIRATION_MINUTES`) and `owner` is ignored by the API.

`POST /v1/link`

```bash
curl -i -X POST "$API_BASE_URL/v1/link" \
  -H "content-type: application/json" \
  -d '{
    "password": "my-strong-password",
    "payload": {
      "target": "https://example.com/profile/alice"
    }
  }'
```

Expected:

- `201 Created`
- JSON containing the generated identifier ending with `.link` and the stored target URI

---

### 4) Resolve any identifier (`.inco` or `.link`)

`GET /v1/resolve/:identifier`

```bash
# Replace with the identifier returned by create endpoints
IDENTIFIER="alice-01.inco"
curl -i "$API_BASE_URL/v1/resolve/$IDENTIFIER"
```

Expected:

- `200 OK` with resolved record data when identifier exists
- `404 Not Found` when identifier does not exist (or expired `.link`)

---

### 5) Update a mutable `.link` record

`PATCH /v1/link/:identifier`

```bash
IDENTIFIER="alice-01.link"

curl -i -X PATCH "$API_BASE_URL/v1/link/$IDENTIFIER" \
  -H "content-type: application/json" \
  -d '{
    "password": "my-strong-password",
    "payload": {
      "target": "https://example.com/profile/alice-v2"
    }
  }'
```

Expected:

- `200 OK` when password is valid and update succeeds
- `401 Unauthorized` when password is invalid

---

### 6) Delete a mutable `.link` record

`DELETE /v1/link/:identifier`

```bash
IDENTIFIER="alice-01.link"

curl -i -X DELETE "$API_BASE_URL/v1/link/$IDENTIFIER" \
  -H "content-type: application/json" \
  -d '{
    "password": "my-strong-password"
  }'
```

Expected:

- `204 No Content` when deletion succeeds
- `401 Unauthorized` when password is invalid

---

### 7) Keep a mutable `.link` record alive (touch/ping)

`POST /v1/link/:identifier/ping`

```bash
IDENTIFIER="alice-01.link"

curl -i -X POST "$API_BASE_URL/v1/link/$IDENTIFIER/ping" \
  -H "content-type: application/json" \
  -d '{
    "password": "my-strong-password"
  }'
```

Expected:

- `200 OK` when password is valid and expiration is refreshed
- `401 Unauthorized` when password is invalid

## D1 Migrations

- `migrations/inco/0001_init.sql`
- `migrations/link/0001_init.sql`

## Local checks

```bash
npm ci
npm run check
npm test
```
