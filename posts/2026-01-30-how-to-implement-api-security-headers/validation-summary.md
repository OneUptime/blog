# Validation Summary: How to Implement API Security Headers

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- HTTP security headers
- Bearer token authentication
- CORS
- Rate limiting headers
- Express.js / Node.js
- FastAPI / Starlette middleware
- Redis
- Jest / Supertest

## Sources Consulted
- RFC 6750: The OAuth 2.0 Authorization Framework: Bearer Token Usage - https://datatracker.ietf.org/doc/html/rfc6750
- RFC 6585: Additional HTTP Status Codes, including 429 Too Many Requests - https://datatracker.ietf.org/doc/html/rfc6585
- IETF draft-ietf-httpapi-ratelimit-headers-11: RateLimit header fields for HTTP - https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-ratelimit-headers
- Express.js middleware documentation - https://expressjs.com/en/guide/using-middleware/
- FastAPI CORS middleware documentation - https://fastapi.tiangolo.com/tutorial/cors/
- MDN WWW-Authenticate header reference - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/WWW-Authenticate

## Issues Found
- The Express rate-limit middleware factory was declared `async`, which means `rateLimitMiddleware(...)` returns a Promise instead of a middleware function. Changed it to a normal function so `app.use(rateLimitMiddleware(...))` receives the middleware callback expected by Express.
- The post described `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset` as the newer draft standard. The current IETF draft defines `RateLimit` and `RateLimit-Policy` instead. Updated the JavaScript and FastAPI examples to emit `RateLimit` and `RateLimit-Policy`, while keeping the legacy `X-RateLimit-*` headers for compatibility.
- The FastAPI protected endpoint read `request.state.user` without ensuring it existed, which would raise an attribute error instead of returning an authentication failure. Added a 401 `HTTPException` with a `WWW-Authenticate: Bearer` header when no authenticated user has been attached by the omitted dependency.

## Review Notes
The examples are syntactically valid: all JavaScript code blocks passed `node --check`, and the Python code block passed `python3` AST parsing. The FastAPI rate limiter uses the synchronous Redis client inside async middleware; it can work, but an async Redis client would be preferable in a production FastAPI application to avoid blocking the event loop.
