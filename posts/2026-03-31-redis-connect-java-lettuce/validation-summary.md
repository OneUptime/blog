# Validation Summary: How to Connect Redis with Java using Lettuce

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Java
- Lettuce (io.lettuce:lettuce-core 6.3.2.RELEASE)
- Project Reactor (reactive streams)
- Netty (underlying transport)
- Spring Data Redis (mentioned as context)

## Sources Consulted
- Lettuce GitHub repository source code: https://github.com/redis/lettuce
- Lettuce wiki - Pipelining and command flushing: https://github.com/lettuce-io/lettuce-core/wiki/Pipelining-and-command-flushing
- Lettuce `StatefulConnection` source (defines `setAutoFlushCommands` and `flushCommands`): https://github.com/lettuce-io/lettuce-core/blob/main/src/main/java/io/lettuce/core/api/StatefulConnection.java
- Lettuce `RedisAsyncCommands` interface source: https://github.com/redis/lettuce/blob/main/src/main/java/io/lettuce/core/api/async/RedisAsyncCommands.java
- Lettuce `AsyncConnectionPoolSupport` source: https://github.com/redis/lettuce/blob/main/src/main/java/io/lettuce/core/support/AsyncConnectionPoolSupport.java
- Lettuce `RedisPubSubListener` and `RedisPubSubAdapter` source: https://github.com/redis/lettuce/blob/main/src/main/java/io/lettuce/core/pubsub/RedisPubSubListener.java
- Lettuce `RedisURI.Builder.withPassword` discussion: https://github.com/redis/lettuce/discussions/1695
- Project Reactor `Mono` API docs: https://projectreactor.io/docs/core/release/api/reactor/core/publisher/Mono.html
- Redis ZREVRANGE deprecation notice: https://redis.io/docs/latest/commands/zrevrange/

## Issues Found
1. **Pipelining section: `setAutoFlushCommands` and `flushCommands` called on wrong object.**
   - **What was wrong:** The code called `async.setAutoFlushCommands(false)`, `async.flushCommands()`, and `async.setAutoFlushCommands(true)` on the `RedisAsyncCommands` object. These methods are defined on the `StatefulConnection` interface, not on `RedisAsyncCommands`, so the code would not compile.
   - **What was changed:** Replaced `async.setAutoFlushCommands(false)` with `connection.setAutoFlushCommands(false)`, `async.flushCommands()` with `connection.flushCommands()`, and `async.setAutoFlushCommands(true)` with `connection.setAutoFlushCommands(true)`.
   - **Why:** The `setAutoFlushCommands(boolean)` and `flushCommands()` methods are declared on `StatefulConnection<K, V>`, which `StatefulRedisConnection` extends. They are not part of the `RedisAsyncCommands` interface hierarchy. The correct pattern is to call these on the connection object while issuing commands through the async API.

## Review Notes
- The Lettuce wiki's own pipelining example (https://github.com/lettuce-io/lettuce-core/wiki/Pipelining-and-command-flushing) shows the same incorrect pattern of calling `setAutoFlushCommands` on the async commands object. This is a known documentation inconsistency in the Lettuce project.
- The `zrevrangeWithScores` method used in the Sorted Set section is not deprecated at the Lettuce API level in 6.3.x, but the underlying Redis `ZREVRANGE` command has been deprecated since Redis 6.2.0 in favor of `ZRANGE ... REV`. This is not an error but worth noting for future updates.
- The Pub/Sub example uses `RedisPubSubListener` (an interface) with an anonymous inner class and "// other methods omitted" comment. Since `RedisPubSubListener` requires implementing all methods, in production code readers should use `RedisPubSubAdapter` instead, which provides empty default implementations. The comment makes it clear the snippet is abbreviated, so this is acceptable.
- The `withPassword(char[])` usage is the recommended approach since `withPassword(String)` is deprecated in Lettuce 6.0+ for security reasons.
- Version 6.3.2.RELEASE is a valid release but not the latest. This is acceptable for a tutorial.
