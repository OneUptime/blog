# Validation Summary: How to Build a Distributed Semaphore with Redis

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Redis sorted sets
- Redis transactions with WATCH/MULTI/EXEC
- Redis Lua scripting with EVAL
- Python with redis-py
- Node.js with ioredis
- Distributed semaphores and concurrency limiting

## Sources Consulted
- Redis Transactions documentation: https://redis.io/docs/latest/develop/using-commands/transactions/
- Redis WATCH command documentation: https://redis.io/docs/latest/commands/watch/
- Redis ZADD command documentation: https://redis.io/docs/latest/commands/zadd/
- Redis ZREMRANGEBYSCORE command documentation: https://redis.io/docs/latest/commands/zremrangebyscore/
- redis-py pipelines and transactions documentation: https://redis.io/docs/latest/develop/clients/redis-py/transpipe/
- ioredis README and transaction documentation: https://github.com/redis/ioredis

## Issues Found
- The Python basic semaphore computed `now` and `expires_at` once before the retry loop. If acquisition blocked and retried, a newly acquired permit could be created with a stale or already-expired score. Moved timestamp calculation inside the loop after cleanup.
- The Python basic semaphore created watched pipelines without using redis-py's context-manager reset pattern. Updated it to use `with self.redis.pipeline() as pipe:` so watched connections are cleaned up reliably after transaction aborts.
- The Python fair semaphore reused the initial timestamp when cleaning expired owners, so owners that expired while a caller waited would not be removed. Updated cleanup to use the current time on each loop iteration.
- The Python fair semaphore checked owner count and moved waiters to owners with separate Redis commands, allowing concurrent acquirers to over-admit permits. Replaced that section with a Lua script that cleans expired owners, checks capacity, checks queue rank, and moves the permit atomically.
- The Node.js semaphore computed `now` and `expiresAt` once before its retry loop, creating the same stale-expiration issue as the Python version. Moved timestamp calculation inside the loop.
- The Node.js semaphore assumed `multi.exec()` would throw on a watched-key conflict. Redis transactions return a null reply when WATCH aborts EXEC, and ioredis can resolve that result as `null`; the example now checks for `null` and retries.

## Review Notes
- The examples use timeout-based permit expiry, which is appropriate for crash recovery but means long-running critical sections must call `extend()` or choose a timeout longer than the maximum expected work duration.
- The Python and JavaScript snippets passed syntax checks after the corrections. Placeholder functions such as `create_db_connection()` and `make_api_request()` are illustrative and intentionally not defined in the post.
