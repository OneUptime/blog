# Validation Summary: How to Connect to Redis from Java with Jedis

## Status
validated

## Post Type
Tutorial / Getting Started Guide

## Technologies Covered
- Redis
- Java
- Jedis (Redis client library for Java, version 5.1.3)
- Apache Commons Pool 2 (underlying JedisPool connection pooling)

## Sources Consulted
- Jedis GitHub repository source code: https://github.com/redis/jedis
- Jedis `Jedis.java` — constructor signatures and method APIs
- Jedis `DefaultJedisClientConfig.java` — builder pattern and TLS/SSL configuration
- Jedis `JedisPool.java` — pool constructors and parameters
- Jedis `JedisPoolConfig.java` — pool configuration (extends Apache Commons Pool GenericObjectPoolConfig)
- Jedis `Pipeline.java` — pipelining API (`pipelined()`, `sync()`, `Response<T>`)
- Jedis `HostAndPort.java` — class existence and package location
- Jedis `SortedSetCommands.java` — `zrevrange` deprecation status
- Apache Commons Pool 2 `GenericObjectPool` — `getNumActive()`, `getNumIdle()`, `getNumWaiters()` methods

## Issues Found

### 1. Missing import: `HostAndPort` in TLS example
- **What was wrong:** The "Connecting with Authentication and TLS" code example used `new HostAndPort(...)` on line 82, but the import block did not include `import redis.clients.jedis.HostAndPort;`. The code would not compile.
- **What was changed:** Added `import redis.clients.jedis.HostAndPort;` to the import block of the `SecureRedisExample` class.
- **Why:** Without this import, the Java compiler cannot resolve the `HostAndPort` class reference.

### 2. Missing import: `Duration` in JedisPool example
- **What was wrong:** The "Connection Pooling with JedisPool" code example used `Duration.ofMillis(5000)` on line 109, but the import block did not include `import java.time.Duration;`. The code would not compile.
- **What was changed:** Added `import java.time.Duration;` to the import block of the `JedisPoolExample` class.
- **Why:** Without this import, the Java compiler cannot resolve the `Duration` class reference.

## Review Notes
- The post uses Jedis version 5.1.3. The latest stable Jedis release is 7.4.1 (as of April 2026). The 5.x APIs demonstrated in the post remain functional, but readers should be aware that in Jedis 7.x+, `JedisPool` and `JedisPoolConfig` are deprecated in favor of `RedisClient` and `ConnectionPoolConfig` respectively.
- The `zrevrange` method used in the sorted sets example is not deprecated in Jedis 5.x, but was deprecated starting in Jedis 7.3.0 (mirroring the Redis server deprecation since 6.2.0). The modern alternative is `zrange()` with `ZRangeParams.rev()`.
- All other code examples (basic connection, hashes, lists, sets, pipelining, pool monitoring) are technically correct and use valid Jedis 5.x APIs.
- The `setex` method used for setting keys with expiration is correct for Jedis 5.x, though newer Redis/Jedis versions favor `SET` with `EX` option.
