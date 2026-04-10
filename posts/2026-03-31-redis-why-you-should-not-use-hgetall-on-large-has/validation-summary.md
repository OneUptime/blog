# Validation Summary: Why You Should Not Use HGETALL on Large Hashes in Redis

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (HGETALL, HMGET, HSCAN, HSET, ZADD, HLEN, SLOWLOG, MONITOR)
- Node.js with ioredis client library
- Python with redis-py client library
- Redis CLI (`redis-cli`) with `--bigkeys`, `--latency` flags

## Sources Consulted
- Redis official documentation for HGETALL: https://redis.io/docs/latest/commands/hgetall/
- Redis official documentation for HSCAN: https://redis.io/docs/latest/commands/hscan/
- Redis official documentation for HMGET: https://redis.io/docs/latest/commands/hmget/
- Redis official documentation for HSET: https://redis.io/docs/latest/commands/hset/
- Redis official documentation for HLEN: https://redis.io/docs/latest/commands/hlen/
- Redis official documentation for SLOWLOG: https://redis.io/docs/latest/commands/slowlog-get/
- Redis official documentation for CONFIG SET (latency-monitor-threshold): https://redis.io/docs/latest/commands/config-set/
- ioredis GitHub repository and API documentation: https://github.com/redis/ioredis
- redis-py documentation: https://redis-py.readthedocs.io/

## Issues Found
1. **Stray `redis-cli` line in bash script** (was line 38): The "Simulate the problem" bash code block contained a standalone `redis-cli` command before the `for` loop. This would open an interactive Redis session and block execution, preventing the loop from running. Removed the line since the `for` loop already invokes `redis-cli HSET` per iteration.

## Review Notes
- The performance comparison table provides approximate timing values. These are reasonable ballpark figures for typical hardware and are appropriately labeled as approximate. Actual times will vary by hardware, Redis version, and configuration.
- The post correctly notes that Redis is single-threaded for command processing. This remains accurate even for Redis 6+ which introduced multi-threaded I/O for network handling, while command execution itself stays single-threaded.
- The HSCAN approach correctly highlights that while total processing time is similar to HGETALL, the key benefit is yielding between iterations so other commands can be served, reducing blocking.
- All ioredis and redis-py API calls are current and non-deprecated.
