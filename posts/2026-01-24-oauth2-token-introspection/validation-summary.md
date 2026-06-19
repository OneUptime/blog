# Validation Summary: How to Handle OAuth2 Token Introspection

## Status
validated

## Post Type
Technical Guide / Tutorial

## Technologies Covered
- OAuth 2.0 Token Introspection
- RFC 7662
- Node.js
- Express
- Axios
- PostgreSQL with `pg`
- bcrypt
- Redis with `ioredis`
- express-rate-limit
- HTTP Basic authentication
- Bearer token authorization

## Sources Consulted
- RFC 7662: OAuth 2.0 Token Introspection — https://datatracker.ietf.org/doc/html/rfc7662
- Axios request configuration documentation — https://axios-http.com/docs/req_config
- Express 4.x API documentation for `express.urlencoded()` — https://expressjs.com/en/4x/api.html#express.urlencoded
- express-rate-limit configuration documentation — https://express-rate-limit.mintlify.app/reference/configuration
- express-rate-limit error code documentation for IPv6-safe custom key generators — https://express-rate-limit.mintlify.app/reference/error-codes
- Node.js crypto documentation for random bytes, hashing, and Base64URL encoding — https://nodejs.org/api/crypto.html

## Issues Found
- **CommonJS usage snippet used top-level `await`.**
  - The example file uses `require()`, so a standalone CommonJS script cannot use top-level `await`.
  - Wrapped the usage example in an async `validateToken()` function and called it with `.catch(console.error)`.

- **The basic introspection server could emit `NaN` for optional timestamp fields.**
  - `exp`, `iat`, and `nbf` are optional RFC 7662 response fields. The original code calculated them unconditionally with `Math.floor(tokenData.<field> / 1000)`, which produces `NaN` when the source value is absent.
  - Changed the example to add each timestamp only when the corresponding token field is present.

- **The database-backed server referenced `rateLimit` without importing it.**
  - The code block used `rateLimit({ windowMs: 60000, max: 100 })` but did not define `rateLimit`.
  - Added `const { rateLimit } = require('express-rate-limit');`.

- **The custom rate-limit key generator fell back to raw `req.ip`.**
  - Current express-rate-limit documentation recommends using `ipKeyGenerator(req.ip)` when a custom `keyGenerator` falls back to client IPs, so IPv6 subnet handling remains correct.
  - Updated the security example to import `ipKeyGenerator` and use it for the IP fallback.

## Review Notes
- The RFC 7662 protocol description is accurate: introspection uses POST with `application/x-www-form-urlencoded`, requires a `token` parameter, permits an optional `token_type_hint`, requires authorization for the endpoint, and returns `active: false` for inactive, unknown, or unauthorized-to-introspect tokens.
- The response examples correctly model `active` as the only required member and use space-separated scopes and NumericDate-style timestamp values.
- The caching guidance is technically correct but carries the standard RFC 7662 tradeoff: cached active responses can remain valid locally after a token has been revoked, so short TTLs or cache invalidation are important for sensitive resources.
- The database schema, audit logger, `extractClientId`, and suspicious-activity helpers are illustrative and intentionally not fully defined in the post.
