# Validation Summary: Redis vs Hazelcast for Distributed Caching

## Status
validated

## Post Type
Comparison / Reference Guide

## Technologies Covered
- Redis (Jedis client, Spring Boot Data Redis)
- Hazelcast (embedded mode, CP Subsystem, IMap, FencedLock)
- Spring Boot 3.x caching with `@Cacheable`
- JCache (JSR-107) / `javax.cache` API
- Redlock distributed locking (Python `redlock-py`)

## Sources Consulted
- Hazelcast 5.x CP Subsystem documentation: FencedLock replaced ILock starting in Hazelcast 4.x, with ILock fully removed in 5.0. https://docs.hazelcast.com/hazelcast/latest/cp-subsystem/fenced-lock
- Spring Boot 3.x configuration properties: `spring.redis.*` was removed in Spring Boot 3.0 in favor of `spring.data.redis.*`. https://docs.spring.io/spring-boot/docs/current/reference/html/application-properties.html
- Jedis GitHub repository and API docs for `setex`, `JedisPool`, try-with-resources pattern
- JCache (JSR-107) specification for `CachingProvider`, `MutableConfiguration`, `CreatedExpiryPolicy`
- Hazelcast IMap API for `put(key, value, ttl, timeUnit)` overload
- Redis Cluster specification for hash slot partitioning (16384 slots)
- `redlock-py` library API for `Redlock` constructor and `lock`/`unlock` methods

## Issues Found

### 1. Outdated Spring Boot Redis configuration prefix (line 41)
- **What was wrong:** The YAML config used `spring.redis.host` and `spring.redis.port`, which was the Spring Boot 2.x property prefix. This prefix was deprecated in Spring Boot 2.7 and removed in Spring Boot 3.0.
- **What was changed:** Updated to `spring.data.redis.host` and `spring.data.redis.port` under the `spring.data.redis` namespace.
- **Why:** Spring Boot 3.x (current) requires the `spring.data.redis.*` prefix. The old prefix will cause configuration to be silently ignored.

### 2. Hazelcast `ILock` replaced by `FencedLock` (line 111 and comparison table)
- **What was wrong:** The code example declared `ILock lock = hz.getCPSubsystem().getLock(...)` and the comparison table referenced "ILock (CP subsystem)". `ILock` was the legacy AP-based distributed lock that was deprecated in Hazelcast 4.x and removed in Hazelcast 5.0. The CP Subsystem's `getCPSubsystem().getLock()` returns `FencedLock`, not `ILock`.
- **What was changed:** Updated the variable type from `ILock` to `FencedLock` in the code example and changed the comparison table entry from "ILock (CP subsystem)" to "FencedLock (CP subsystem)".
- **Why:** `FencedLock` is the correct return type of `getCPSubsystem().getLock()` and the current Hazelcast distributed lock implementation built on Raft consensus.

## Review Notes
- The `redlock-py` Python library used in the Redlock example is unmaintained. More modern alternatives include `redis-py`'s built-in `redis.lock.Lock` or the `pottery` library. The code is technically correct but readers should be aware of the maintenance status.
- The Near-cache row in the comparison table describes Redis as "Client-side (read-through)". Redis 6+ supports server-assisted client-side caching via `CLIENT TRACKING`, which is more nuanced than a simple read-through cache, but the simplification is acceptable for a comparison table.
- The Hazelcast WAN replication feature mentioned in the table is an Enterprise-only feature. The post doesn't distinguish between open-source and Enterprise editions, which could be misleading for readers evaluating the open-source version.
