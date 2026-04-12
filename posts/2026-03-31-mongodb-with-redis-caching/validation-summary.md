# Validation Summary: How to Use MongoDB with Redis for Caching

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (Node.js driver v6+)
- Redis (node-redis v4+)
- Node.js
- MongoDB Change Streams
- MongoDB Aggregation Pipeline

## Sources Consulted
- node-redis v4 documentation: https://github.com/redis/node-redis
- Redis DEL command documentation: https://redis.io/commands/del/ (confirms DEL does not support glob patterns)
- Redis KEYS command documentation: https://redis.io/commands/keys/
- MongoDB Change Streams documentation: https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB Node.js driver `watch()` documentation: https://www.mongodb.com/docs/drivers/node/current/usage-examples/changeStream/
- MongoDB `findOneAndUpdate` documentation: https://www.mongodb.com/docs/drivers/node/current/fundamentals/crud/compound-operations/

## Issues Found

1. **Incorrect comment in `invalidateListCaches` function**: The comment said "Use SCAN to find and delete all keys matching the prefix" but the code actually uses the `KEYS` command, not `SCAN`. Fixed the comment to say "Use KEYS" to match the actual code.

2. **Missing `fullDocument` option in Change Stream `watch()` call**: The change stream handler accessed `change.fullDocument` to read the product category for cache invalidation, but the `watch()` call did not include `{ fullDocument: "updateLookup" }`. Without this option, `change.fullDocument` is `undefined` for update events (it's only included by default for replace events), making the category-based invalidation dead code for updates. Fixed by adding `{ fullDocument: "updateLookup" }` as the second argument to `watch()`.

3. **`redisClient.del()` called with a glob pattern**: The line `await redisClient.del(`top_products:${category}:*`)` attempted to use a glob wildcard with the Redis `DEL` command. `DEL` does not support pattern matching — it treats the key name literally, so this would try to delete a key literally named `top_products:electronics:*` which doesn't exist. The subsequent lines correctly used `KEYS` to find matching keys and then `DEL` to delete them. Removed the erroneous `del` call.

## Review Notes
- The `KEYS` command (used in `invalidateListCaches` and the change stream handler) blocks the Redis server while scanning the entire keyspace and is not recommended for production use with large datasets. `SCAN` with an iterator would be more appropriate for production. This is a best-practice concern rather than a correctness bug.
- The rate limiting pattern has a theoretical race condition between `INCR` and `EXPIRE` — if the process crashes after increment but before setting expiry, the key persists without a TTL. A Lua script or `MULTI/EXEC` would be more robust. This is a common simplification in tutorials.
- The change stream handler uses `change.documentKey._id` for the cache key, while the cache-aside pattern uses the `productId` field. These will only match if `productId` is stored in the `_id` field. This is an implicit assumption that may confuse readers, but is acceptable for a pattern demonstration.
- For delete events in the change stream, `fullDocument` is not available even with `updateLookup`, so category-based invalidation won't trigger on deletes. This is a limitation worth noting but not a code error per se.
