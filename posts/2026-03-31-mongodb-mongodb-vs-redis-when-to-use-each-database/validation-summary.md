# Validation Summary: MongoDB vs Redis: When to Use Each Database

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- MongoDB (document database, WiredTiger storage engine, replica sets, write concerns)
- Redis (in-memory data store, RDB snapshots, AOF persistence, sorted sets, pub/sub)
- Node.js (cache-aside pattern with Redis and MongoDB driver)

## Sources Consulted
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/
- Redis ZADD command documentation: https://redis.io/docs/latest/commands/zadd/
- Redis ZRANGE command documentation (6.2+ extended syntax): https://redis.io/docs/latest/commands/zrange/
- Redis PUBLISH command documentation: https://redis.io/docs/latest/commands/publish/
- Redis SETEX command documentation: https://redis.io/docs/latest/commands/setex/
- Redis persistence documentation (RDB and AOF): https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- MongoDB insertOne documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.insertOne/
- MongoDB find/sort documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.find/
- MongoDB Write Concern documentation: https://www.mongodb.com/docs/manual/reference/write-concern/
- MongoDB WiredTiger storage engine: https://www.mongodb.com/docs/manual/core/wiredtiger/

## Issues Found
No technical issues found.

## Review Notes
- The `ZRANGE ... WITHSCORES REV` syntax requires Redis 6.2+. Prior versions would need `ZREVRANGE ... WITHSCORES` instead. The post does not specify a Redis version, but the modern syntax is appropriate for current deployments.
- The Node.js example uses `redis.setex()`, which corresponds to the Redis SETEX command. While SETEX is still fully supported, some newer Redis client libraries (e.g., node-redis v4+) prefer `redis.set(key, value, { EX: ttl })`. This is a stylistic preference, not an error — ioredis and the SETEX command itself remain valid.
- The latency ranges cited (Redis < 1ms, MongoDB 1-10ms for indexed queries) are reasonable generalizations for typical deployments, though actual performance depends heavily on hardware, network, and query complexity.
