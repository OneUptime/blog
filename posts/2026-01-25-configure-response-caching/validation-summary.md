# Validation Summary: How to Configure Response Caching

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- HTTP caching headers
- Express.js
- Nginx reverse proxy caching
- NodeCache
- Flask-Caching
- Redis and ioredis

## Sources Consulted
- RFC 9111: HTTP Caching: https://www.rfc-editor.org/rfc/rfc9111
- RFC 9110: HTTP Semantics, 304 Not Modified: https://www.rfc-editor.org/rfc/rfc9110#status.304
- RFC 5861: HTTP Cache-Control Extensions for Stale Content: https://datatracker.ietf.org/doc/html/rfc5861
- MDN Cache-Control reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control
- Express 5.x API reference: https://expressjs.com/en/api/
- Nginx ngx_http_proxy_module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx content caching documentation: https://docs.nginx.com/nginx/admin-guide/content-cache/content-caching/
- Flask-Caching documentation: https://flask-caching.readthedocs.io/
- NodeCache README: https://github.com/node-cache/node-cache/blob/master/README.md
- Redis KEYS command documentation: https://redis.io/docs/latest/commands/keys/
- Redis SCAN command documentation: https://redis.io/docs/latest/commands/scan/
- Redis SETEX command documentation: https://redis.io/docs/latest/commands/setex/

## Issues Found
- The Express conditional request examples returned 304 before setting the same cache metadata that would be present on a 200 response. Updated the examples to set `Cache-Control`, `ETag`, and `Last-Modified` before checking freshness with `req.fresh`.
- The Last-Modified example compared millisecond-precision application timestamps to second-precision HTTP dates. Updated the timestamp handling to truncate milliseconds before generating and validating the `Last-Modified` value.
- The Nginx example showed `proxy_cache_path` and `server` at the top level of `nginx.conf`, but those directives belong in the `http` context. Wrapped the snippet in `http {}` and added an example `upstream backend` block.
- The Nginx comment said `proxy_cache_revalidate on` respects backend `Cache-Control`; that directive actually enables conditional revalidation for expired cached responses. Updated the comment.
- The Nginx search cache comment claimed query parameters were sorted, but the snippet only included `$args` as received. Updated the comment to describe the actual cache key behavior.
- The Flask-Caching example used the deprecated lowercase Redis backend name. Updated `CACHE_TYPE` to `RedisCache`.
- The Flask-Caching invalidation example deleted a key that did not match the route decorator's cache key. Added an explicit `key_prefix='products'` and updated invalidation to delete `products`.
- The Redis invalidation example used `KEYS`, which Redis warns against in regular production application code. Replaced it with cursor-based `SCAN`.
- The Redis examples used deprecated `SETEX`. Replaced those calls with `SET ... EX`.

## Review Notes
- The examples remain illustrative and assume helper functions such as `getProducts()`, `authenticate`, and database access functions exist in the reader's application.
- `SMEMBERS` is acceptable for small tag sets, but large production tag indexes should use incremental set scanning (`SSCAN`) or bounded secondary indexes.
