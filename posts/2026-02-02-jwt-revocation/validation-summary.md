# Validation Summary: How to Handle JWT Revocation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- JSON Web Tokens (JWT) — RFC 7519
- Node.js
- `jsonwebtoken` npm package
- `ioredis` npm package (Redis client)
- `pg` npm package (PostgreSQL client)
- `uuid` npm package
- Node.js built-in `crypto` module
- Express.js
- Redis (blacklist storage, pub/sub)
- PostgreSQL (refresh token storage)
- Mermaid diagrams (sequence + flowchart)

## Sources Consulted
- RFC 7519 (JSON Web Token): https://datatracker.ietf.org/doc/html/rfc7519 — verified `jti`, `sub`, `iat`, `exp` claim semantics
- RFC 7009 / RFC 6749 background for revocation patterns
- jsonwebtoken README: https://github.com/auth0/node-jsonwebtoken — verified `jwt.sign`, `jwt.verify`, `jwt.decode`, `TokenExpiredError`, `JsonWebTokenError`, `expiresIn` option
- ioredis README: https://github.com/redis/ioredis — verified `setex`, `set`, `get`, `exists` (returns 1/0), `incr`, `ttl`, `subscribe`/`publish` callback signatures, `quit`/`unsubscribe`
- node-postgres docs: https://node-postgres.com/ — verified `Pool({ connectionString })`, `pool.query`, `pool.connect()`/`client.release()` transaction pattern
- Node.js crypto docs: https://nodejs.org/api/crypto.html — verified `createHash('sha256').update(...).digest('hex')`
- PostgreSQL CREATE TABLE / UNIQUE constraint behavior: https://www.postgresql.org/docs/current/sql-createtable.html — verified that a column `UNIQUE` already creates a unique index, so a duplicate table-level `CONSTRAINT ... UNIQUE` on the same column is redundant
- ECMAScript spec on `Map` iteration order — verified that `Map.prototype.keys().next().value` returns the oldest-inserted key and that `Map.set` on an existing key does NOT change insertion order (so the eviction in the post is FIFO, not LRU)

## Issues Found
1. **Misleading "LRU eviction" comment** in `distributed-blacklist.js`. The `addToLocalCache` method evicts the first key returned by the Map's iterator, which is the oldest-inserted key. Since neither the writer (`set` on an existing key keeps the original position) nor the reader (`get` doesn't reorder) updates recency, the policy is FIFO, not LRU. True LRU would require `delete`+`set` on access. Changed the comment to "FIFO eviction (oldest insertion is evicted first)" to accurately describe the behavior. The runtime behavior is unchanged.
2. **Redundant unique constraint** in the `refresh_tokens` SQL schema. The column was declared `token_id VARCHAR(255) UNIQUE NOT NULL`, which already creates an implicit unique index. The trailing `CONSTRAINT idx_token_id UNIQUE (token_id)` added a second, duplicate unique constraint/index on the same column (wasted storage and write overhead, and slightly confusing for readers — also note the `idx_` naming convention is unusual for a constraint). Removed the redundant `CONSTRAINT` line so the schema only declares the unique constraint once via the column-level keyword.

## Review Notes
- The cryptographic and protocol-level claims are all correct: JWTs are stateless and self-validating, `jti` (RFC 7519 §4.1.7) is the right claim to use as the revocation handle, hashing refresh tokens with SHA-256 before storage is appropriate, and using separate ioredis connections for `subscribe`/`publish`/normal commands is required (a subscribed connection cannot issue normal commands).
- The transaction pattern in `RefreshTokenStore.rotate` (BEGIN/COMMIT/ROLLBACK with `client.release()` in `finally`) follows node-postgres' recommended pool-client pattern correctly.
- The token-versioning strategy's `isVersionValid` uses `>=` against the stored version, which is the correct boundary: a token issued at version N must remain valid until the version is incremented past N.
- One thing worth flagging for future revisions (not a correctness issue): the `verifyAccessToken` middleware verifies the JWT signature with `jwt.verify` but does not pass an `issuer`/`audience` option to validate the `iss` claim that `TokenService` sets at issuance. Validating `iss` (and ideally `aud`) on verify is a defense-in-depth improvement, but is not strictly required for correctness given the example uses a single secret.
- Token lifetime recommendations (15m access, 7d refresh, 30d "remember me") are reasonable industry defaults and match common OAuth 2.0 / OIDC guidance.
- The post correctly identifies the refresh-token reuse pattern as a potential breach indicator and revokes all of the user's tokens in that case, which matches RFC 6749 §10.4 refresh token rotation guidance.
