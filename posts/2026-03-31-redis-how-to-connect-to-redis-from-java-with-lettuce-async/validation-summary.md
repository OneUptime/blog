# Validation Summary: How to Connect to Redis from Java with Lettuce (Async)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Java
- Lettuce (lettuce-core 6.3.2.RELEASE)
- Netty (underlying transport)
- Project Reactor (reactive API)
- Apache Commons Pool2 (connection pooling)
- Redis Sentinel
- Redis Cluster

## Sources Consulted
- Lettuce GitHub repository: https://github.com/redis/lettuce
- Lettuce Reference Guide: https://redis.github.io/lettuce/
- Redis.io Lettuce client guide: https://redis.io/docs/latest/develop/clients/lettuce/
- StatefulRedisConnection JavaDoc: https://lettuce.io/core/release/api/io/lettuce/core/api/StatefulRedisConnection.html
- RedisURI.Builder JavaDoc: https://javadoc.io/static/io.lettuce/lettuce-core/6.5.2.RELEASE/io/lettuce/core/RedisURI.Builder.html
- RedisClusterClient JavaDoc: https://lettuce.io/core/release/api/io/lettuce/core/cluster/RedisClusterClient.html
- Lettuce Wiki - Asynchronous API: https://github.com/lettuce-io/lettuce-core/wiki/Asynchronous-API
- Lettuce Wiki - Connection Pooling: https://github.com/lettuce-io/lettuce-core/wiki/Connection-Pooling
- Lettuce Wiki - Redis Sentinel: https://github.com/lettuce-io/lettuce-core/wiki/Redis-Sentinel
- Lettuce Wiki - Redis Cluster: https://github.com/lettuce-io/lettuce-core/wiki/Redis-Cluster

## Issues Found

1. **Missing `java.time.Duration` import in TLS/auth example**: The `SecureLettuceExample` class used `Duration.ofSeconds(5)` without importing `java.time.Duration`. Added the missing import statement.

2. **Incorrect `RedisClusterClient.create()` usage**: The cluster example passed a comma-separated URI string (`"redis://node1:6379,redis://node2:6379,redis://node3:6379"`), but `RedisClusterClient.create(String)` only accepts a single URI. For multiple seed nodes, the method signature requires `Iterable<RedisURI>`. Fixed to use `RedisClusterClient.create(List.of(RedisURI.create(...), ...))` with proper imports for `RedisURI` and `java.util.List`.

3. **Incomplete reactive scan pattern**: The original code used `Flux.from(reactive.scan())` which only retrieves the first page of scan results (a single `KeyScanCursor`), not all keys. Replaced with `ScanStream.scan(reactive)` which properly handles cursor iteration and returns a `Flux<String>` of all keys. Added the `io.lettuce.core.ScanStream` import.

## Review Notes
- The Lettuce version used (6.3.2.RELEASE) is valid but not the latest. The current latest release is in the 6.5.x line. The APIs shown are stable and backward-compatible, so this is not a correctness issue.
- The section title "Connection Pooling with AsyncPool" is slightly misleading since the code uses `GenericObjectPool` (synchronous pool from Commons Pool2), not Lettuce's `BoundedAsyncPool`. The title is informal and not strictly wrong, but readers looking for Lettuce's async pool (`AsyncConnectionPoolSupport.createBoundedObjectPool()`) may be confused.
- In the Sentinel example, `.withPassword()` sets the password for the Redis master node, not for the Sentinel instances themselves. If Sentinels also require authentication, their passwords must be set separately by iterating over `sentinelUri.getSentinels()`. This is a common gotcha worth noting in a future update.
- The `RedisFuture` chaining pattern in the async example is correct. `RedisFuture` extends `CompletionStage`, so `thenCompose()` is available directly without calling `.toCompletableFuture()` first. The `.toCompletableFuture()` at the end of the chain is correct for converting to a standard `CompletableFuture`.
