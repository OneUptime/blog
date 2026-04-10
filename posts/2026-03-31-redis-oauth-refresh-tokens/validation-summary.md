# Validation Summary: How to Store OAuth Refresh Tokens in Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (HSET, EXPIRE, DEL, SMEMBERS, MULTI/EXEC commands)
- Node.js (crypto module)
- node-redis v4+ client library
- OAuth 2.0 refresh token rotation pattern
- SHA-256 token hashing

## Sources Consulted
- Redis HSET command documentation: https://redis.io/docs/latest/commands/hset/
- Redis EXPIRE command documentation: https://redis.io/docs/latest/commands/expire/
- Redis SADD/SMEMBERS command documentation: https://redis.io/docs/latest/commands/sadd/
- node-redis v4 documentation: https://github.com/redis/node-redis
- Node.js crypto module documentation: https://nodejs.org/api/crypto.html
- OAuth 2.0 Security Best Current Practice (RFC 6819 and draft-ietf-oauth-security-topics): https://datatracker.ietf.org/doc/html/rfc6819

## Issues Found

### 1. Missing `sAdd` call in `issueRefreshToken` (Critical)
**What was wrong:** The `revokeAllUserTokens` function reads token hashes from a Redis set at `user:${userId}:refresh_tokens`, but `issueRefreshToken` never adds the token hash to this set. This means bulk revocation (e.g., on password change) would silently do nothing because the set is always empty.

**What was changed:** Added `await redis.sAdd(\`user:${userId}:refresh_tokens\`, tokenHash);` to `issueRefreshToken` after setting the hash and TTL.

**Why:** Without this, the user-to-tokens index is never populated, making `revokeAllUserTokens` non-functional.

### 2. Missing set updates in `rotateRefreshToken` (Critical)
**What was wrong:** When rotating a token, the old token hash was deleted from Redis but not removed from the user's token set, and the new token hash was never added to the set. Over time, the set would accumulate stale hashes pointing to deleted keys, and new tokens would be invisible to bulk revocation.

**What was changed:** Added `await redis.sRem(userTokensKey, tokenHash);` and `await redis.sAdd(userTokensKey, newHash);` to `rotateRefreshToken` after creating the new token.

**Why:** The user's token set must stay in sync with actual token keys for `revokeAllUserTokens` to work correctly.

## Review Notes
- The `rotateRefreshToken` function has a TOCTOU (time-of-check-time-of-use) race condition: between `hGetAll` and `del`, a concurrent request could also read and use the same token. In production, this should be handled with a Redis Lua script or WATCH/MULTI/EXEC for atomicity. This is acceptable simplification for a blog tutorial but worth noting for readers implementing this in production.
- The `hGetAll` call in node-redis v4 returns an empty object `{}` for non-existent keys (not `null`). The check `if (!stored || !stored.userId)` works correctly because `!stored.userId` catches this case, though the `!stored` branch is unreachable.
- The variable named `pipeline` in `revokeAllUserTokens` is actually a Redis transaction (MULTI/EXEC), not a pipeline. The distinction matters in Redis semantics (transactions are atomic, pipelines are not), though the functionality is correct for this use case.
- The rotation limit of 10 is a reasonable security heuristic, but the comment "detect reuse attacks" is slightly misleading. Actual reuse of a rotated token is already detected by the token key being deleted. The rotation limit guards against prolonged use of a single token family.
