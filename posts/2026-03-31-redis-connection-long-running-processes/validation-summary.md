# Validation Summary: How to Handle Redis Connection in Long-Running Processes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (server)
- redis-py (Python Redis client)
- ioredis (Node.js Redis client)
- TCP keepalive (socket-level connection health)
- Unix signals (SIGTERM, SIGINT)

## Sources Consulted
- redis-py `connection.py` source — confirmed `socket_keepalive_options` keys are passed directly to `socket.setsockopt()`, requiring integer constants (https://github.com/redis/redis-py/blob/master/redis/connection.py)
- redis-py `exceptions.py` source — confirmed `BrokenPipeError` is not in the redis-py exception hierarchy (https://github.com/redis/redis-py/blob/master/redis/exceptions.py)
- redis-py issue #2101 — confirms string keys in `socket_keepalive_options` cause `TypeError` (https://github.com/redis/redis-py/issues/2101)
- ioredis `RedisOptions.ts` source — confirmed `keepAlive` option name and millisecond value format (https://github.com/redis/ioredis/blob/main/lib/redis/RedisOptions.ts)
- ioredis `event_handler.ts` source — confirmed `reconnecting` event emits the retry delay value (https://github.com/redis/ioredis/blob/main/lib/redis/event_handler.ts)

## Issues Found

### 1. `socket_keepalive_options` used string keys instead of socket constants
- **What was wrong:** The `socket_keepalive_options` dictionary used string keys (`"TCP_KEEPIDLE"`, `"TCP_KEEPINTVL"`, `"TCP_KEEPCNT"`). redis-py passes these keys directly to `socket.setsockopt()`, which requires integer constants. String keys cause a `TypeError` at runtime.
- **What was changed:** Added `import socket` and changed string keys to `socket.TCP_KEEPIDLE`, `socket.TCP_KEEPINTVL`, and `socket.TCP_KEEPCNT`.
- **Why:** The code as written would fail with `TypeError: an integer is required (got type str)` when establishing a connection.

### 2. `redis.BrokenPipeError` does not exist
- **What was wrong:** The `ensure_connected` function caught `redis.BrokenPipeError`, which is not a class in redis-py's exception hierarchy. This would cause an `AttributeError` when the except clause is evaluated.
- **What was changed:** Replaced `(redis.ConnectionError, redis.BrokenPipeError)` with `redis.ConnectionError`.
- **Why:** redis-py wraps underlying socket errors (including broken pipes) as `redis.ConnectionError`, so catching `redis.ConnectionError` alone is sufficient and correct.

## Review Notes
- The AWS ELB idle timeout example uses 350 seconds, which matches the default for AWS Network Load Balancer (NLB) TCP flows, not Classic ELB or ALB (which default to 60 seconds). The text says "AWS ELB" which is slightly imprecise but not technically wrong since ELB is sometimes used as a generic term for AWS Elastic Load Balancing.
- The `socket.TCP_KEEPIDLE`, `socket.TCP_KEEPINTVL`, and `socket.TCP_KEEPCNT` constants are Linux-specific. On macOS, only `socket.TCP_KEEPALIVE` (equivalent to `TCP_KEEPIDLE`) is available. The post could note this platform limitation but it is acceptable as-is since most Redis deployments run on Linux.
- The ioredis code and configuration are correct. The `keepAlive`, `retryStrategy`, and event handlers all match current ioredis API.
