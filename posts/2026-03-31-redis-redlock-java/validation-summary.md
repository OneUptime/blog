# Validation Summary: How to Implement Redlock in Java

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (distributed locking via the Redlock algorithm)
- Java
- Redisson (Redis Java client with built-in distributed lock support)
- Jedis (low-level Redis Java client)
- Lua scripting (for atomic lock release)

## Sources Consulted
- Redisson GitHub Wiki: Distributed locks and synchronizers — https://github.com/redisson/redisson/wiki/8.-Distributed-locks-and-synchronizers
- Redisson GitHub Issue #2669: Improve RLock reliability during failover and deprecate RedLock — https://github.com/redisson/redisson/issues/2669
- RedissonRedLock Javadoc (3.46.0) confirming deprecated status — https://www.javadoc.io/static/org.redisson/redisson/3.46.0/org/redisson/RedissonRedLock.html
- Jedis GitHub source: eval() method signature — https://github.com/redis/jedis
- Jedis GitHub source: SetParams class — https://github.com/redis/jedis
- Redis official Redlock specification — https://redis.io/docs/manual/patterns/distributed-locks/

## Issues Found

### 1. `RedissonRedLock` is deprecated — replaced with `RedissonMultiLock`
- **What was wrong:** The post used `RedissonRedLock` throughout (imports, variable declarations, the OrderService class, and the summary). This class has been deprecated since Redisson ~3.16 and users are directed to use `RedissonMultiLock` instead. While the class still compiles, a tutorial should not teach readers to use deprecated APIs.
- **What was changed:** Replaced all references to `RedissonRedLock` with `RedissonMultiLock`. Updated imports, variable names (`redLock` to `multiLock`), constructor parameter types, and the summary paragraph.

### 2. First code snippet incorrectly used `useClusterServers()` for Redlock
- **What was wrong:** The initial Redisson configuration example used `config.useClusterServers().addNodeAddress(...)` with a comment saying "Use multiple independent Redis nodes for Redlock." This is incorrect — `useClusterServers()` configures a connection to a Redis Cluster, which is fundamentally different from the independent Redis instances that the Redlock algorithm requires.
- **What was changed:** Replaced the snippet with a `createClient(String address)` helper method using `config.useSingleServer().setAddress(address)`, which correctly creates a client for a single independent Redis instance. Updated the second snippet to call `RedlockConfig.createClient(...)` for consistency. Added clarifying text that Redlock requires independent Redis instances, not a cluster.

### 3. Unused import of `RedissonMultiLock` in original code
- **What was wrong:** The original second snippet imported `RedissonMultiLock` but only used `RedissonRedLock`. This was a minor inconsistency.
- **What was changed:** The import is now correctly used since `RedissonMultiLock` replaced `RedissonRedLock`.

## Review Notes
- The Jedis-based custom implementation is technically sound: the `eval()` method signature, `SetParams` API, quorum calculation (`N/2 + 1`), clock drift formula (`TTL * 0.01 + 2ms`), and Lua release script all match the official Redlock specification and current Jedis APIs (verified through 7.x).
- `RedissonRedLock` still exists in Redisson (it extends `RedissonMultiLock`) but is deprecated and logs a runtime warning. A tutorial should guide readers toward the supported API.
- The post could benefit from a note that Redisson's maintainer (Nikita Koval) recommends using a standard `RLock` with the `WAIT` command for most use cases, as improved failover handling in modern Redisson reduces the need for the full Redlock algorithm. However, this is an editorial suggestion, not a technical error.
