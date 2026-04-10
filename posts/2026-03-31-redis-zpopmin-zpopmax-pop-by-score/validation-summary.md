# Validation Summary: How to Use ZPOPMIN and ZPOPMAX in Redis to Pop by Score

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis (5.0+)
- Redis Sorted Sets
- ZPOPMIN / ZPOPMAX commands
- BZPOPMIN / BZPOPMAX (blocking variants, mentioned for comparison)

## Sources Consulted
- Redis official documentation for ZPOPMIN: https://redis.io/commands/zpopmin/
- Redis official documentation for ZPOPMAX: https://redis.io/commands/zpopmax/
- Redis official documentation for BZPOPMIN: https://redis.io/commands/bzpopmin/
- Redis official documentation for ZADD: https://redis.io/commands/zadd/
- Redis official documentation for ZRANGE: https://redis.io/commands/zrange/
- Redis official documentation for ZREMRANGEBYSCORE: https://redis.io/commands/zremrangebyscore/

## Issues Found
- **Lua-style comment in Redis code block**: The "Min-Heap Priority Queue" example contained `-- Process next task:` inside a Redis code block. Redis CLI does not support `--` as a comment syntax (that is Lua syntax). If a reader copy-pasted the block into redis-cli, the `--` line would cause an error. Removed the comment line from the code block.

## Review Notes
- All command syntax, return values, and example outputs are accurate for Redis 5.0+ with RESP2 protocol.
- The performance complexity claims (O(log N) for single pop, O(count * log N) for multiple) are correct per the official documentation.
- The suggestion to use ZRANGEBYSCORE + ZREM or ZREMRANGEBYSCORE for large batch operations is a valid optimization tip, since those are O(log N + M) vs O(M * log N).
- The BZPOPMIN comparison is accurate but does not mention the required `timeout` parameter for BZPOPMIN. This is acceptable for a brief comparison section.
- ZPOPMIN and ZPOPMAX were introduced in Redis 5.0. The post does not mention version requirements, which is a minor omission but unlikely to cause issues since Redis 5.0 is widely deployed.
