# Validation Summary: How to Create Memory Cache with TTL in Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Node.js
- JavaScript `Map`
- In-memory caching
- TTL expiration
- LRU eviction
- Node.js timers
- Node.js `https`
- `node-cache`
- `lru-cache`

## Sources Consulted
- Node.js Timers documentation: https://nodejs.org/api/timers.html
- Node.js HTTPS documentation: https://nodejs.org/api/https.html
- `node-cache` README: https://github.com/node-cache/node-cache/blob/master/README.md
- `node-cache` npm metadata: https://www.npmjs.com/package/node-cache
- `lru-cache` README: https://github.com/isaacs/node-lru-cache
- `lru-cache` typedocs: https://isaacs.github.io/node-lru-cache/classes/LRUCache.html
- `lru-cache` npm metadata: https://www.npmjs.com/package/lru-cache

## Issues Found
- The `TTLCache.has()` method used `this.get(key) !== undefined`, which incorrectly reported a present, unexpired key as missing if its cached value was `undefined`. Changed it to inspect the stored cache entry and expiration timestamp directly.
- The `MemoryLimitedCache.set()` method removed an existing node from the linked list before rejecting an oversized replacement, but did not remove the old key from the `Map`. This could leave a stale map entry pointing at a detached node. Added `this.cache.delete(key)` when replacing an existing entry.
- The comparison table said `lru-cache` has no automatic cleanup. Current `lru-cache` documentation says stale items are not preemptively deleted by default, but `ttlAutopurge` is available. Updated the table to say automatic cleanup is optional with `ttlAutopurge`.
- The comparison table said `node-cache` has no dependencies. Current npm metadata shows `node-cache` depends on `clone`. Updated the dependency row.
- The comparison table described `node-cache` async support as "Events", which is misleading because events are notifications, not async cached fetch support. Updated the row to say `node-cache` async support is manual, and clarified that `lru-cache` async support is through `fetchMethod`/`fetch`.

## Review Notes
- The `lru-cache` example uses current CommonJS import syntax, `max`, `maxSize`, `sizeCalculation`, `ttl`, `allowStale`, `updateAgeOnGet`, `updateAgeOnHas`, `getRemainingTTL()`, `size`, and `calculatedSize` APIs that are present in current `lru-cache` documentation.
- The Node.js timer usage with `setInterval()` and `unref()` matches the current Node.js timers documentation.
- The API response example is intentionally simple and does not cover HTTP status handling, redirects, response size limits, or response stream errors. It is acceptable for a tutorial example, but a production implementation should handle those cases.
