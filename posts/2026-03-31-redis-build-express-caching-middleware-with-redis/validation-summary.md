# Validation Summary: How to Build Express.js Caching Middleware with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Express.js (Node.js)
- ioredis (Node.js Redis client)
- npm

## Sources Consulted
- ioredis API documentation: https://github.com/redis/ioredis#readme
- Express.js API reference (req.method, req.originalUrl, res.json, res.setHeader): https://expressjs.com/en/api.html
- Redis SETEX command: https://redis.io/commands/setex/
- Redis KEYS command: https://redis.io/commands/keys/
- Redis DEL command: https://redis.io/commands/del/
- curl man page (difference between -I and -i flags): https://curl.se/docs/manpage.html

## Issues Found
- **`curl -I` should be `curl -i` in Testing section**: The testing section used `curl -I` (uppercase), which sends a HEAD request. Since the cache middleware explicitly skips non-GET requests (`if (req.method !== "GET") return next()`), the X-Cache headers would never be set for HEAD requests. Changed to `curl -i` (lowercase), which sends a normal GET request and includes response headers in the output.

## Review Notes
- The `redis.keys(pattern)` call in the invalidation helper is correct but worth noting that the Redis `KEYS` command blocks the server and is discouraged in production with large keyspaces. `SCAN` is the recommended alternative. This is acceptable for a tutorial.
- The `res.json` override is made `async`, which changes its return type from the `res` object to a `Promise`. This works for the code shown in the post (route handlers don't use the return value), but could cause issues if other middleware or code depends on the synchronous return contract of `res.json`. Acceptable for a tutorial demonstrating the concept.
- Using `JSON.stringify(req.query)` as a cache key for the search route means the same query parameters in different URL order (e.g., `?a=1&b=2` vs `?b=2&a=1`) may produce different cache keys. This is a known trade-off, not an error.
