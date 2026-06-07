# Validation Summary: How to Handle Caching in REST APIs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HTTP caching (Cache-Control, ETag, Last-Modified, Expires, Vary)
- Conditional requests (If-None-Match, 304 Not Modified)
- Node.js / Express middleware
- Node.js `crypto` module (MD5 hashing for ETag generation)
- ioredis (Redis client for Node.js)
- CDN caching (Cloudflare, Fastly) with stale-while-revalidate
- Cache invalidation strategies (time-based, event-based, versioned keys)

## Sources Consulted
- RFC 9111 (HTTP Caching) — https://www.rfc-editor.org/rfc/rfc9111
- RFC 7234 (HTTP/1.1 Caching, predecessor) — https://www.rfc-editor.org/rfc/rfc7234
- RFC 7232 (Conditional Requests, ETag / If-None-Match / 304) — https://www.rfc-editor.org/rfc/rfc7232
- RFC 5861 (stale-while-revalidate) — https://www.rfc-editor.org/rfc/rfc5861
- RFC 8246 (immutable Cache-Control directive) — https://www.rfc-editor.org/rfc/rfc8246
- MDN — Cache-Control — https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control
- MDN — ETag and Vary
- Express 4.x API reference (`res.set`, `res.status`, `res.json`, `res.end`) — https://expressjs.com/en/api.html
- Node.js `crypto` documentation (`createHash`, `update`, `digest`) — https://nodejs.org/api/crypto.html
- ioredis README — `setex`, `get`, `del`, `keys` command signatures — https://github.com/redis/ioredis

## Issues Found
No technical issues found.

Spot-checks that passed:
- Cache-Control directives (`public`, `private`, `max-age`, `s-maxage`, `no-cache`, `no-store`, `must-revalidate`, `immutable`) match RFC 9111 / RFC 8246.
- Strong (`"abc123"`) and weak (`W/"abc123"`) ETag syntax matches RFC 7232 §2.3.
- `Last-Modified` example uses the IMF-fixdate HTTP-date format per RFC 7231 §7.1.1.1.
- Express middleware code is syntactically valid; the `res.set` / `res.status(304).end()` calls match the Express 4.x API.
- The `etagMiddleware` correctly sets `ETag` before checking `If-None-Match`, and a 304 response with an empty body and the validator header is RFC-compliant.
- `crypto.createHash('md5').update(...).digest('hex')` matches the Node.js `crypto` API.
- ioredis `setex(key, seconds, value)` argument order is correct (key, ttl in seconds, value).
- `redis.del(...keys)` spread call is valid — ioredis `del` accepts variadic keys.
- `stale-while-revalidate=300` syntax matches RFC 5861.
- The `Vary: Authorization` recommendation for per-user responses is correct.
- The middleware's guard preventing `s-maxage` from being emitted alongside `private` is a reasonable safeguard (s-maxage applies to shared caches, while `private` forbids shared caching).

## Review Notes
- The `private` description ("Only the browser can cache this — not CDNs") is a simplification — strictly, `private` permits any private (non-shared) cache, of which the browser is the most common example. The simplification is fine for a practical guide.
- The custom `etagMiddleware` overrides `res.json` for ETag generation. Express also has a built-in ETag mechanism (`app.set('etag', ...)`) that emits weak ETags by default; readers using both could end up with duplicated work. Not incorrect, just worth mentioning as a future enhancement.
- MD5 is fine as a non-cryptographic ETag hash (used for content fingerprinting only). Some teams prefer SHA-1 or xxhash for performance/collision properties, but MD5 is widely used and acceptable here.
- `redis.keys(pattern)` is a blocking O(N) command. The post correctly labels `invalidatePattern` as a utility, but production users should prefer `SCAN` on large keyspaces. Not a correctness issue.
- The middleware comment "only safe methods should be cached" is a reasonable simplification; HEAD is also a safe, cacheable method per RFC 9110, and POST can be cacheable in narrow scenarios. Only allowing GET in the middleware is the standard practical choice.
