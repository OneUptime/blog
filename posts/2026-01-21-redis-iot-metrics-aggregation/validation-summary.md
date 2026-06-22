# Validation Summary: How to Aggregate IoT Metrics with Redis

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Redis
- Redis hashes, lists, sorted sets, TTLs, Lua scripting, and pipelines
- Python
- redis-py
- Node.js
- ioredis
- IoT metrics aggregation and time-windowed metrics

## Sources Consulted
- Redis command documentation: https://redis.io/docs/latest/commands/
- Redis EVAL documentation: https://redis.io/docs/latest/commands/eval/
- Redis EXPIRE documentation: https://redis.io/docs/latest/commands/expire/
- Redis HINCRBYFLOAT documentation: https://redis.io/docs/latest/commands/hincrbyfloat/
- Redis ZADD documentation: https://redis.io/docs/latest/commands/zadd/
- Redis ZRANGE documentation: https://redis.io/docs/latest/commands/zrange/
- Redis ZREMRANGEBYRANK documentation: https://redis.io/docs/latest/commands/zremrangebyrank/
- redis-py guide: https://redis.io/docs/latest/develop/clients/redis-py/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html
- ioredis documentation: https://ioredis.readthedocs.io/en/stable/README/
- ioredis API documentation: https://redis.github.io/ioredis/
- Node.js ECMAScript modules documentation: https://nodejs.org/api/esm.html
- MDN await documentation: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await

## Issues Found
- The Node.js example used CommonJS `require('ioredis')` with top-level `await` in the usage block. Top-level `await` is valid in modules but not in a normal CommonJS script, so the example would fail as written in a typical `.js` CommonJS file. I wrapped the usage code in an async `main()` function and called `main().catch(console.error)`.
- The percentile example used the sorted-set member string `timestamp:value`, which can collide if identical values are recorded with the same timestamp. Since Redis sorted-set members are unique, that would overwrite earlier samples and undercount readings. I added `time.time_ns()` to the member string to make collisions unlikely.
- The percentile example trimmed the sorted set with `ZREMRANGEBYRANK` while using the metric value as the score. That removes the lowest-valued samples, not the oldest samples, and biases percentile calculations upward. I removed the rank trim so the windowed sorted set remains an exact value distribution until its TTL expires.

## Review Notes
- The Redis commands and client APIs used in the examples are current and valid.
- The standard deviation examples compute population standard deviation for each window. That is technically valid for full-window metric aggregation, but readers who need sample standard deviation should use the sample variance formula.
- `KEYS` is acceptable in the narrow example, but production systems with many aggregation keys should prefer an index, Redis Streams, or incremental scanning to avoid blocking Redis during flushes.
