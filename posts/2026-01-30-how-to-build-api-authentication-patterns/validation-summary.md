# Validation Summary: How to Build API Authentication Patterns

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- Express
- API keys
- JSON Web Tokens
- OAuth 2.0
- PKCE
- Mutual TLS
- Axios

## Sources Consulted
- Node.js Crypto documentation: https://nodejs.org/api/crypto.html
- Node.js Buffer documentation: https://nodejs.org/api/buffer.html
- Node.js TLS documentation: https://nodejs.org/api/tls.html
- Node.js HTTPS documentation: https://nodejs.org/api/https.html
- Node.js HTTP documentation: https://nodejs.org/api/http.html
- Express API reference: https://expressjs.com/en/api/
- jsonwebtoken package documentation: https://www.npmjs.com/package/jsonwebtoken
- Axios package documentation: https://www.npmjs.com/package/axios
- RFC 6749, OAuth 2.0 Authorization Framework: https://datatracker.ietf.org/doc/html/rfc6749
- RFC 6750, OAuth 2.0 Bearer Token Usage: https://datatracker.ietf.org/doc/html/rfc6750
- RFC 7519, JSON Web Token: https://datatracker.ietf.org/doc/html/rfc7519
- RFC 7636, Proof Key for Code Exchange: https://datatracker.ietf.org/doc/html/rfc7636
- RFC 9700, Best Current Practice for OAuth 2.0 Security: https://datatracker.ietf.org/doc/rfc9700/

## Issues Found
- Corrected the API key middleware description. The post claimed the middleware's constant-time comparison prevented timing attacks, but the lookup path hashes the presented key and queries by hash rather than using the `secureCompare` helper. The text now accurately describes the helper as useful for direct equal-length secret comparisons.
- Updated the JWT logout route to verify the refresh token with `jwtAuth.verifyRefreshToken(refreshToken)` before revoking its `jti`. The previous code used `jwt.decode(refreshToken)`, which does not verify the token signature or claims before trusting the token ID.
- Added the missing `axios` import to the OAuth routes example because `fetchUserInfo` uses `axios.get`.
- Updated the mTLS middleware to read `authorized` and `authorizationError` from `req.socket`, matching Node.js TLS socket documentation. The previous code used `req.client`.
- Wrapped the mTLS client usage example in an async function. The previous CommonJS-style snippet used top-level `await`, which would not parse as a normal CommonJS script.

## Review Notes
All JavaScript code fences were syntax-checked locally with Node.js v22.22.0 after the fixes. Several examples remain intentionally illustrative and depend on application-specific objects such as repositories, `userService`, and Express app setup.
