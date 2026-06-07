# Validation Summary: How to Handle Authentication in REST APIs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- JSON Web Tokens (JWT) via `jsonwebtoken` (Node.js)
- Express.js
- OAuth 2.0 via Passport.js (`passport`, `passport-google-oauth20`)
- `express-session` for session-based authentication
- `connect-redis` + `redis` for session storage
- `express-rate-limit` for brute-force protection
- Mermaid (for the sequence diagram)

## Sources Consulted
- `jsonwebtoken` npm package documentation: https://github.com/auth0/node-jsonwebtoken
- Passport.js documentation: https://www.passportjs.org/
- `passport-google-oauth20` package: https://github.com/jaredhanson/passport-google-oauth2
- `express-session` documentation: https://github.com/expressjs/session
- `connect-redis` repository (v7 → v8 migration notes): https://github.com/tj/connect-redis
- `redis` (node-redis v4+) documentation: https://github.com/redis/node-redis
- `express-rate-limit` documentation: https://github.com/express-rate-limit/express-rate-limit
- MDN `Authorization` header docs: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization
- RFC 7519 (JWT), RFC 6749 (OAuth 2.0), RFC 6750 (Bearer Token Usage)
- Mermaid sequenceDiagram syntax: https://mermaid.js.org/syntax/sequenceDiagram.html

## Issues Found
- **`connect-redis` import syntax was outdated.** The original code used `const RedisStore = require('connect-redis').default;`, which is the v7 import form. As of `connect-redis` v8.0.0 (2024), the export changed from a default export to a named export, so the v7 form yields `undefined` and the `new RedisStore(...)` call would throw. Updated to the current named-export form: `const { RedisStore } = require('connect-redis');`. This now matches what `npm install connect-redis` will install today.

## Review Notes
- The JWT example uses the synchronous `jwt.sign` call and the async-callback form of `jwt.verify`, both of which are valid current APIs in `jsonwebtoken`.
- The Authorization header parsing (`authHeader.split(' ')[1]`) correctly handles the `Bearer <token>` scheme described in RFC 6750.
- The Passport.js example uses the standard `passport-google-oauth20` strategy; the callback signature `(accessToken, refreshToken, profile, done)` is correct.
- In `express-rate-limit` v7+, the `max` option is deprecated in favor of `limit`, but `max` is still supported as an alias, so the example continues to work. A future revision could switch to `limit` for clarity.
- The demo login handler stores a plaintext password literal (`'password123'`) for illustration; the post correctly calls this out as simplified and warns about hashing in production.
- The session example calls `redisClient.connect()` without awaiting it; node-redis v4 queues commands until the connection is ready, so this works in practice, but awaiting it in startup code would be cleaner.
- The comparison table's classification of JWT as "stateless" and sessions as "not stateless" is accurate; OAuth being "Depends" is fair since whether the resulting access token is stateless depends on whether it is a JWT or an opaque token validated via introspection (RFC 7662).
