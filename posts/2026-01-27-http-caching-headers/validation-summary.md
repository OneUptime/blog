# Validation Summary: How to Use HTTP Caching Headers in REST APIs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- HTTP caching
- Cache-Control directives
- ETag and conditional requests
- Vary header and content negotiation
- Express.js response APIs
- CDN caching with Cloudflare, Fastly, Varnish, and Akamai
- Cache invalidation and purge APIs

## Sources Consulted
- RFC 9111: HTTP Caching - https://datatracker.ietf.org/doc/html/rfc9111
- RFC 9110: HTTP Semantics - https://datatracker.ietf.org/doc/html/rfc9110
- RFC 5861: HTTP Cache-Control Extensions for Stale Content - https://datatracker.ietf.org/doc/html/rfc5861
- RFC 8246: HTTP Immutable Responses - https://datatracker.ietf.org/doc/html/rfc8246
- RFC 9213: Targeted HTTP Cache Control - https://datatracker.ietf.org/doc/rfc9213/
- Express.js 5.x Response API - https://expressjs.com/en/5x/api/response/
- Cloudflare CDN-Cache-Control documentation - https://developers.cloudflare.com/cache/concepts/cdn-cache-control/
- Cloudflare purge cache documentation - https://developers.cloudflare.com/cache/how-to/purge-cache/
- Fastly surrogate key purge documentation - https://www.fastly.com/documentation/guides/full-site-delivery/purging/purging-with-surrogate-keys/
- Akamai downstream cacheability documentation - https://techdocs.akamai.com/property-mgr/docs/downstream-cacheability

## Issues Found
- The conditional GET example checked `If-Modified-Since` even when a non-matching `If-None-Match` header was present. Updated the code so `If-None-Match` takes precedence and `If-Modified-Since` is only evaluated when `If-None-Match` is absent.
- The ETag comparison examples only handled exact single-tag matches. Updated the GET example to handle comma-separated `If-None-Match` values and weak comparison, and updated the PUT example to handle `If-Match: *` and lists of strong ETags.
- The sample `Last-Modified` value used an incomplete HTTP date and the wrong weekday for January 27, 2026. Replaced it with `Tue, 27 Jan 2026 12:00:00 GMT`.
- The `private` directive was described as browser-only caching. Updated wording to "private caches" because the directive prevents shared caches from storing the response, while allowing private caches.
- The `immutable` directive was described as meaning content never changes. Updated wording to clarify that it applies during the response freshness lifetime.

## Review Notes
The remaining examples are illustrative snippets and depend on application-specific functions such as `getProducts`, `generateToken`, `db.articles`, and CDN credentials. CDN behavior can also depend on product configuration, cache rules, and plan-specific features, so the vendor-specific snippets should be treated as implementation patterns rather than complete drop-in integrations.
