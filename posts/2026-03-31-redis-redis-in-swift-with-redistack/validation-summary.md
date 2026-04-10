# Validation Summary: How to Use Redis in Swift with RediStack

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Swift (server-side)
- RediStack (Swift Redis client)
- SwiftNIO
- Vapor (web framework)
- vapor/redis (Vapor Redis integration)

## Sources Consulted
- RediStack GitHub repository and source code: https://github.com/swift-server/RediStack
- RediStack `StringCommands.swift`, `HashCommands.swift`, `BasicCommands.swift`, `PubSubCommands.swift` source files
- RediStack `RedisConnection.swift` for connection API and `sendCommandsImmediately` pipelining
- RediStack `RESPValue.swift` for value initializer visibility (`init(bulk:)` is internal)
- RediStack `RedisCommand.swift` (non-generic struct, no static factory methods)
- Vapor Redis package: https://github.com/vapor/redis
- Vapor Redis `Application+Redis.swift` and `Request+Redis.swift` for integration API

## Issues Found

### 1. CRITICAL: Pipelining section used entirely fabricated APIs
- **What was wrong:** The code used `connection.makePipeline()`, `RedisCommand<Void>.set(...)`, `pipeline.enqueue(...)`, and `pipeline.execute()` -- none of these APIs exist in RediStack. `RedisCommand` is a plain (non-generic) struct with no static factory methods, and there is no pipeline object API.
- **What was changed:** Rewrote the pipelining section to use RediStack's actual pipelining mechanism: setting `connection.sendCommandsImmediately = false` to buffer commands, collecting futures, then setting it back to `true` to flush, and awaiting all futures with `EventLoopFuture.andAllSucceed`.
- **Why:** The original code would not compile. RediStack implements pipelining via the `sendCommandsImmediately` property on `RedisConnection`, not via a pipeline builder object.

### 2. HIGH: `RESPValue.init(bulk:)` is internal, not public
- **What was wrong:** The hash fields example used `RESPValue.init(bulk: "...")` which is an `@usableFromInline internal` initializer -- not accessible from user code.
- **What was changed:** Changed `[String: RESPValue]` with `.init(bulk:)` calls to `[String: String]` with plain string values, since `String` conforms to `RESPValueConvertible` and `hmset` accepts `[String: Value]` where `Value: RESPValueConvertible`.
- **Why:** The original code would not compile outside the RediStack module.

### 3. HIGH: Pub/Sub subscribe API had wrong signature
- **What was wrong:** The code used a trailing closure without the required `messageReceiver:` argument label, and the closure parameters were semantically reversed (first param was treated as message, but it's actually the channel name).
- **What was changed:** Added the `messageReceiver:` label and corrected the closure to `{ channel, message in ... }` matching the actual callback signature `(RedisChannelName, RESPValue) -> Void`. Also changed channel argument from `["alerts"]` array to `"alerts"` single channel.
- **Why:** RediStack's `subscribe` method requires the `messageReceiver:` label. The first callback parameter is the channel name (`RedisChannelName`), not the message.

### 4. LOW: Missing `try` on Vapor Redis configuration
- **What was wrong:** `app.redis.configuration = .init(hostname: "localhost")` was missing `try` -- `RedisConfiguration.init(hostname:)` is a throwing initializer.
- **What was changed:** Added `try` before `.init(hostname: "localhost")`.
- **Why:** The code would not compile without `try` since the initializer can throw.

## Review Notes
- The package version `from: "1.4.0"` is functional but outdated. The RediStack README currently recommends `from: "1.6.2"`, with `1.6.3` being the latest release. This was not changed since `1.4.0` is still valid with semantic versioning (it will resolve to the latest compatible version).
- The connection and basic operations, hash GET, publish, RedisKey, and Vapor route handler sections were all verified as correct.
- The summary's advice about using `.wait()` in scripts/tests and async/await in production is sound guidance.
