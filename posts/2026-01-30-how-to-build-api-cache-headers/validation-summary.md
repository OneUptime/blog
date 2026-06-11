# Validation Summary: How to Build API Cache Headers

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- HTTP caching
- Cache-Control, ETag, Last-Modified, Vary, and conditional request headers
- Node.js
- Express
- curl
- CDN cache invalidation with surrogate keys and cache tags

## Sources Consulted
- RFC 9111: HTTP Caching - https://www.rfc-editor.org/rfc/rfc9111.html
- RFC 9110: HTTP Semantics - https://datatracker.ietf.org/doc/html/rfc9110
- MDN Cache-Control reference - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control
- MDN If-None-Match reference - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/If-None-Match
- Express 5.x API reference - https://expressjs.com/en/5x/api/
- Node.js crypto documentation - https://nodejs.org/api/crypto.html
- curl local help/manual behavior for `-I`, `-H`, and `-v`
- Amazon CloudFront cache expiration documentation - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html
- Cloudflare purge by cache-tags documentation - https://developers.cloudflare.com/cache/how-to/purge-cache/purge-by-tags/
- Fastly surrogate key documentation - https://www.fastly.com/documentation/guides/full-site-delivery/purging/purging-with-surrogate-keys/

## Issues Found
- Two JavaScript placeholders were not syntactically valid JavaScript: `res.json({ products: [...] })` and `res.json({ rates: {...} })`. Changed them to valid placeholder values so the examples parse.
- The standalone ETag middleware could return `304 Not Modified` for non-GET/HEAD methods. Updated the match helper to only perform 304 cache validation for `GET` and `HEAD`.
- The Last-Modified middleware did not account for invalid dates and could use `If-Modified-Since` even when `If-None-Match` was present. Added invalid-date handling and made it skip `If-Modified-Since` when `If-None-Match` is present, matching HTTP conditional request precedence.
- The unified cache controller's `standard` strategy disabled `Last-Modified`, but the full application example claimed the standard product route had Last-Modified support. Enabled `lastModified` for the strategy while still only setting the header when `getLastModified` is supplied.
- The unified cache controller could evaluate conditional requests for non-GET/HEAD methods and did not explicitly stop after a non-matching `If-None-Match`. Restricted 304 validation to `GET` and `HEAD`, and made `If-None-Match` take precedence over `If-Modified-Since`.
- The curl example used an invalid weekday for `29 Jan 2026`. Changed `Wed, 29 Jan 2026` to `Thu, 29 Jan 2026`.

## Review Notes
The implementation examples are suitable tutorial code, not drop-in production infrastructure. Real deployments should also consider Express's built-in ETag/freshness behavior, CDN-specific purge API shapes, authenticated response caching policy, and whether custom ETag generation should use the exact serialized bytes sent on the wire when strong validators are required.
