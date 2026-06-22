# Validation Summary: How to Handle API Key Management

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Node.js JavaScript
- Node.js `crypto` and `Buffer` APIs
- Express middleware and request/response APIs
- Redis sorted sets
- ioredis
- Mongoose-style database model operations
- API key authentication, authorization, rotation, revocation, rate limiting, and audit logging

## Sources Consulted
- Node.js Buffer documentation: https://nodejs.org/api/buffer.html
- Node.js Crypto documentation: https://nodejs.org/api/crypto.html
- Express 5.x request API documentation: https://expressjs.com/en/5x/api/request/
- Express 5.x API reference: https://expressjs.com/en/api/
- ioredis official repository documentation: https://github.com/redis/ioredis
- Redis ZADD command documentation: https://redis.io/docs/latest/commands/zadd/
- Redis ZREMRANGEBYSCORE command documentation: https://redis.io/docs/latest/commands/zremrangebyscore/
- Redis ZRANGE command documentation: https://redis.io/docs/latest/commands/zrange/
- OAuth 2.0 Bearer Token Usage, RFC 6750 reference: https://oauth.net/2/bearer-tokens/
- OWASP Secrets Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
- OWASP REST Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html
- Mongoose Model API documentation: https://mongoosejs.com/docs/api/model.html

## Issues Found
- The structured API key format comment did not match the generated format. Updated it from `prefix_version_randomdata_checksum` to `type_environment_version_randomdata_checksum`.
- `validateKeyFormat()` assumed the provided key was always a string. Added a type guard so malformed query/header input does not throw when `.split()` is called.
- The storage example imported `bcrypt` and claimed to use SHA-256 followed by bcrypt, but the code only used SHA-256. Removed the unused import and corrected the comment to describe deterministic SHA-256 lookup for high-entropy API keys.
- The rotation example inferred the key environment only from `keyHint`, which would not preserve sandbox keys. Added an `environment` field when creating key records and reused it during rotation, with the original hint-based fallback retained.
- The Bearer token parsing used a loose string replacement. Updated it to parse the `Authorization: Bearer <token>` format explicitly and case-insensitively.
- The rate limiter counted requests before adding the current request, making `current`, `remaining`, and the limit boundary off by one. Updated the Redis operations so the current request is counted and `allowed` reflects the inclusive limit.
- The rate limiter used a non-atomic pipeline for the sliding-window mutation and count. Changed it to an ioredis transaction with `multi()`.
- The rate limiter used `Math.random()` in the Redis sorted set member and calculated reset time as `now + window`. Replaced the member suffix with `crypto.randomUUID()` and calculated `resetAt` from the oldest request timestamp still in the sorted set.

## Review Notes
The code examples are illustrative and depend on application-provided models and helpers such as `ApiKey`, `AuditLog`, `logSecurityEvent`, `sendNotification`, and `scheduleKeyExpirationNotification`. The JavaScript snippets were syntax-checked individually with `node --check`; runtime behavior was reviewed against the official APIs listed above.
