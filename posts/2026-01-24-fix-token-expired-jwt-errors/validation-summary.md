# Validation Summary: How to Fix 'Token Expired' JWT Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- JSON Web Tokens (JWT)
- Node.js
- Express
- jsonwebtoken
- Python
- PyJWT
- Browser Fetch API
- Web Storage / localStorage
- Axios interceptors

## Sources Consulted
- RFC 7519: JSON Web Token (JWT): https://datatracker.ietf.org/doc/html/rfc7519
- auth0/node-jsonwebtoken README: https://github.com/auth0/node-jsonwebtoken
- PyJWT usage documentation: https://pyjwt.readthedocs.io/en/latest/usage.html
- Axios interceptors documentation: https://axios-http.com/docs/interceptors
- Express 5.x API reference: https://expressjs.com/en/api/
- MDN localStorage documentation: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
- MDN Fetch API documentation: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch

## Issues Found
- The JavaScript and Python manual expiration checks used `payload.exp < now`. RFC 7519 defines `exp` as the time on or after which the token must not be accepted, so equality is also expired. Changed both checks to `payload.exp <= now` / `exp <= now`.
- The Express refresh endpoint read `req.body` without registering JSON body parsing middleware. Added `app.use(express.json());` after creating the Express app so JSON request bodies are available.
- The Axios refresh queue resolved pending requests after a successful refresh, but pending requests could remain unresolved if the refresh request failed. Added rejection handling for queued requests on refresh failure.

## Review Notes
- The examples are intentionally illustrative and assume application-specific functions such as `validateCredentials`, `storeRefreshToken`, and `isRefreshTokenValid` are implemented elsewhere.
- The post correctly warns that decoding a JWT payload without verification is for inspection/debugging only and should not be treated as validation.
- The localStorage examples are technically valid, but future security hardening could show an HttpOnly cookie-based refresh-token pattern in more detail.
