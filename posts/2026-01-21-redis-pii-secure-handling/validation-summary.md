# Validation Summary: How to Handle PII in Redis Securely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Redis
- ioredis
- Node.js
- JavaScript
- Node.js crypto module
- AES-256-GCM encryption
- Tokenization
- Data masking
- Audit logging
- Data retention and deletion

## Sources Consulted
- Redis HSET command documentation: https://redis.io/docs/latest/commands/hset/
- Redis SCAN command documentation: https://redis.io/docs/latest/commands/scan/
- Redis ZRANGE command documentation: https://redis.io/docs/latest/commands/zrange/
- Redis ZRANGEBYSCORE command documentation: https://redis.io/docs/latest/commands/zrangebyscore/
- ioredis official README and API behavior: https://github.com/redis/ioredis
- Node.js crypto documentation: https://nodejs.org/api/crypto.html

## Issues Found
- The tokenization example created a plain SHA-256 hash of the PII value for deduplication. This is unsafe for low-entropy PII such as SSNs or phone numbers because the stored lookup key can be brute-forced. Changed the lookup index to use HMAC-SHA-256 with a separate derived lookup key.
- The tokenizer constructor did not validate that the encryption key was present. Added an explicit error when `PII_ENCRYPTION_KEY` is missing so the example fails clearly instead of producing a crypto argument error.
- The AES-GCM example used a 16-byte IV. Node.js accepts this, but 12-byte nonces are the standard GCM choice and avoid unnecessary GHASH processing. Changed the example to use `crypto.randomBytes(12)`.
- The Redis hash example attempted to store `lastAccessed: null`. Redis hash fields store string-like values, so this was changed to an empty string.
- The usage example called `redis.hset(...)` without defining `redis`. Changed it to use `tokenizer.redis.hset(...)`, which exists in the example.
- The DOB masking function said it showed only the year but returned a fully masked date. Changed it to return the UTC year when the input date is valid, and a fully masked fallback for invalid dates.
- The audit and retention examples used `zrangebyscore`, which Redis marks deprecated as of Redis 6.2. Changed both examples to `zrange(..., 'BYSCORE', ...)`.
- The data minimization example said analytics needs no PII but kept `user_id`. Changed the analytics required fields to an empty list.
- The anonymization example stored `_original_key`, preserving a direct link back to the source record. Removed that field from the anonymized record.

## Review Notes
All JavaScript code blocks were syntax-checked with Node.js. The examples remain illustrative and still need production hardening around key management, authorization integration, Redis ACL/TLS configuration, and operational retention policies before use in a regulated environment.
