# Validation Summary: How to Implement CDN Origin Caching with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (node-redis v4+ for Node.js, redis-py for Python)
- Node.js / Express
- Python (requests library)
- CDN caching (Cache-Control headers, Cloudflare purge API)
- HTTP caching directives (RFC 7234, RFC 5861)

## Sources Consulted
- node-redis v4 documentation: https://github.com/redis/node-redis
- redis-py documentation: https://redis-py.readthedocs.io/
- Cloudflare API v4 - Purge Cache: https://developers.cloudflare.com/api/resources/cache/subresources/purge/methods/purge/
- RFC 7234 (HTTP/1.1 Caching): https://datatracker.ietf.org/doc/html/rfc7234
- RFC 5861 (stale-while-revalidate): https://datatracker.ietf.org/doc/html/rfc5861
- Redis CLI documentation: https://redis.io/docs/latest/commands/

## Issues Found
No technical issues found.

## Review Notes
- `client.connect()` is called without `await`, which means the client may not be fully connected when the first request arrives. In practice, node-redis v4 queues commands until connected, so the code is functional. Adding `await` would be a best-practice improvement but is not a correctness issue.
- The post uses both JavaScript (Node.js/Express) and Python for different sections, which is intentional — the invalidation example is shown in Python as a separate service concern. This is a reasonable choice for a real-world architecture where different services may use different languages.
- The `s-maxage` and `max-age` are set to the same value (3600) in the Express example. In some architectures, these would differ (e.g., shorter `max-age` for browsers, longer `s-maxage` for CDN). The current values are valid but the reader should be aware they can be tuned independently.
