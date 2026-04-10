# Validation Summary: How to Cache OpenID Connect Discovery Metadata with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (node-redis v4+ npm package)
- OpenID Connect Discovery 1.0 (`/.well-known/openid-configuration`)
- JSON Web Key Sets (JWKS)
- jose npm library (v4+) for JWT verification
- Node.js (with native `fetch` API, requires Node.js 18+)

## Sources Consulted
- OpenID Connect Discovery 1.0 specification: https://openid.net/specs/openid-connect-discovery-1_0.html
- node-redis v4 documentation: https://github.com/redis/node-redis
- jose npm library documentation: https://github.com/panva/jose
- RFC 7517 - JSON Web Key (JWK): https://datatracker.ietf.org/doc/html/rfc7517

## Issues Found
- **Bug in `validateIdToken` key rotation fallback**: The catch block that handles `ERR_JWKS_NO_MATCHING_KEY` was deleting the wrong Redis cache key. It used `oidc:jwks:${encodeURIComponent(issuer)}` (e.g., `oidc:jwks:https%3A%2F%2Faccounts.google.com`), but `getJwks` caches under `oidc:jwks:${encodeURIComponent(jwksUri)}` (e.g., `oidc:jwks:https%3A%2F%2Fwww.googleapis.com%2Foauth2%2Fv3%2Fcerts`). Since the issuer URL and JWKS URI are different, the `redis.del` call would not actually clear the stale JWKS, making the retry return the same cached data. Fixed by fetching the discovery document first to obtain the correct `jwks_uri` before deleting the cache entry.

## Review Notes
- The `redis-cli keys "oidc:*"` command shown in the "Inspecting Cached Keys" section uses the `KEYS` command, which is known to block Redis in production with large key spaces. For production use, `SCAN` with a pattern would be preferable, but this is acceptable for a debugging/inspection example.
- The code uses top-level `await` (e.g., `await redis.connect()`) which requires ES modules or a top-level async context. This is fine for modern Node.js but worth noting for readers using CommonJS modules with older Node.js versions.
- The `jose` API usage (`createLocalJWKSet`, `jwtVerify`, error code `ERR_JWKS_NO_MATCHING_KEY`) is correct for jose v4+.
- The node-redis API (`createClient`, `connect`, `get`, `setEx`, `del`) is correct for node-redis v4+.
