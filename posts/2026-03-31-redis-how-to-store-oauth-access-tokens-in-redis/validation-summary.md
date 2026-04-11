# Validation Summary: How to Store OAuth Access Tokens in Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (ioredis Node.js client)
- Node.js (crypto module)
- OAuth 2.0 access tokens
- Express.js middleware
- RFC 7662 Token Introspection

## Sources Consulted
- ioredis documentation: https://github.com/redis/ioredis
- Node.js crypto module documentation: https://nodejs.org/api/crypto.html
- Redis commands documentation (HSET, HGETALL, EXPIRE, SADD, SREM, SCARD, INCR, DEL): https://redis.io/commands
- RFC 7662 - OAuth 2.0 Token Introspection: https://datatracker.ietf.org/doc/html/rfc7662
- RFC 6749 - The OAuth 2.0 Authorization Framework: https://datatracker.ietf.org/doc/html/rfc6749

## Issues Found
1. **Incorrect `iat` field in Token Introspection Endpoint**: The introspection response used `Math.floor(Date.now() / 1000)` for the `iat` (issued at) field, which returns the current time rather than when the token was originally issued. Per RFC 7662 Section 2.2, `iat` must indicate when the token was originally issued. Fixed by:
   - Adding `issuedAt` to the return value of `validateAccessToken` (reading from the stored `issuedAt` field that was already being saved in `storeAccessToken`).
   - Changing the introspection endpoint to use `result.issuedAt.getTime() / 1000` instead of `Date.now() / 1000`.

## Review Notes
- The `revokeAllUserTokens` function marks all user tokens as revoked and deletes the user's tracking set, but does not remove those token hashes from the corresponding `oauth:client:{clientId}:tokens` sets. This means client sets may accumulate stale entries over time. This is not a correctness bug (revoked tokens still fail validation), but could be improved for cleanliness in a production system.
- The `ioredis` `hgetall` command returns an empty object `{}` for non-existent keys (not `null`). The check `!data || !data.userId` works correctly because `!data.userId` catches the empty object case, though the `!data` guard is technically always false for `hgetall` results.
- All Redis commands (HSET with object syntax, pipeline, EXPIRE, SADD, SREM, SMEMBERS, SCARD, INCR, DEL) are used correctly per the ioredis API.
- SHA-256 hashing of tokens before storage is a sound security practice that prevents token exposure in Redis key listings, logs, or memory dumps.
