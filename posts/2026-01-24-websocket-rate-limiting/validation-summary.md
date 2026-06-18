# Validation Summary: How to Handle WebSocket Rate Limiting

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- WebSocket protocol
- Node.js
- ws WebSocket library
- JavaScript rate limiting algorithms
- Redis
- ioredis
- Redis Lua scripting
- Prometheus-style metrics exposition

## Sources Consulted
- RFC 6455, The WebSocket Protocol: https://datatracker.ietf.org/doc/html/rfc6455
- ws API documentation: https://github.com/websockets/ws/blob/master/doc/ws.md
- ws npm package documentation: https://www.npmjs.com/package/ws
- Node.js Web Crypto API documentation: https://nodejs.org/api/webcrypto.html
- Redis EVAL command documentation: https://redis.io/docs/latest/commands/eval/
- Redis Lua scripting documentation: https://redis.io/docs/latest/develop/programmability/eval-intro/
- Redis Lua API reference: https://redis.io/docs/latest/develop/programmability/lua-api/
- Redis HMSET command documentation: https://redis.io/docs/latest/commands/hmset/
- Redis HSET command documentation: https://redis.io/docs/latest/commands/hset/
- ioredis Lua scripting documentation: https://github.com/redis/ioredis
- MDN WebSocket readyState documentation: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState
- MDN CloseEvent code documentation: https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code

## Issues Found
- The connection limiter cleanup code checked `tokens >= capacity` without first refilling idle buckets, so partially depleted idle buckets could remain in memory indefinitely. Updated the cleanup loop to refill each bucket before deciding whether it has been full and idle long enough to delete.
- The multi-tier limiter status method reported token counts without refilling first, which could show stale remaining capacity. Updated `getStatus()` to refill the global and type limiters before returning status.
- The Redis sliding-window Lua script used `math.random()` to make sorted-set members unique. Replaced it with a deterministic member suffix based on the current sorted-set count, avoiding unnecessary randomness while preserving uniqueness for accepted entries in the current window.
- The Redis token bucket Lua script used `HMSET`, which Redis documents as deprecated since Redis 4.0. Replaced both uses with multi-field `HSET`, the recommended replacement.
- The multi-tier WebSocket server example used `crypto.randomUUID()` without importing Node's crypto module. Added `require('node:crypto')` so the CommonJS snippet is self-contained and follows Node.js documentation.

## Review Notes
The examples are syntactically valid as standalone JavaScript snippets. The `ws` examples use current APIs, and close code `1008` is appropriate for policy/rate-limit violations. For production use, connection throttling is usually best performed before or during the HTTP upgrade path, and payload limits should be enforced explicitly with server configuration such as `ws` `maxPayload` or equivalent edge controls.
