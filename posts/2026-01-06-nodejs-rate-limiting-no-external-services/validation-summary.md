# Validation Summary: How to Implement Rate Limiting in Node.js Without External Services

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Node.js
- Express middleware
- HTTP rate limiting algorithms
- Node.js cluster IPC
- HTTP rate limit response headers

## Sources Consulted
- Node.js Cluster API documentation: https://nodejs.org/api/cluster.html
- Express 5.x API documentation: https://expressjs.com/en/api/
- Express behind proxies guide: https://expressjs.com/en/guide/behind-proxies/
- IETF HTTPAPI RateLimit header fields draft: https://greenbytes.de/tech/webdav/draft-ietf-httpapi-ratelimit-headers-latest.html
- MDN Retry-After header reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Retry-After
- GitHub author profile: https://github.com/nawazdhandala

## Issues Found
- Fixed the fixed-window middleware to use the limiter instance defaults for `X-RateLimit-Limit` and `retryAfter`, so omitted options do not produce undefined headers or `NaN` retry values.
- Fixed cleanup parsing in fixed-window, sliding-window, and cluster examples to read the timestamp/window suffix from the last colon. This avoids breaking keys derived from IPv6 addresses or compound identifiers such as `ip:email`.
- Updated the reusable `RateLimiter` constructor so constructor-level options are actually merged into `defaultOptions`.
- Fixed the reusable `RateLimiter` cleanup logic. The fixed-window implementation now stores epoch millisecond window starts like the sliding-window implementation, and cleanup compares timestamps consistently. Token-bucket stores now clean idle buckets by `lastRefill` instead of attempting to parse timestamps from arbitrary keys.
- Replaced deprecated `cluster.isMaster` with `cluster.isPrimary`, matching current Node.js documentation.
- Changed the response-header section wording from "Standard headers" / "Draft IETF standard headers" to "Common headers" / "Legacy draft/de facto RateLimit headers" because the current IETF draft uses `RateLimit` and `RateLimit-Policy`, while the separate `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset` fields are legacy draft/de facto conventions.

## Review Notes
- All JavaScript code fences were syntax-checked with Node.js v22.22.0 after the edits.
- The examples remain in-memory only. They are appropriate for single-process use and illustrative cluster IPC, but production deployments across multiple hosts still need shared state or an external coordination layer.
