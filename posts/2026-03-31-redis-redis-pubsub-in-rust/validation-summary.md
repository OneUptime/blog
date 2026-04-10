# Validation Summary: How to Use Redis Pub/Sub in Rust

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Pub/Sub messaging)
- Rust programming language
- `redis` crate (version 0.25)
- Tokio async runtime
- `futures-util` crate

## Sources Consulted
- Official `redis` crate documentation on docs.rs: https://docs.rs/redis/0.25.0/redis/
- `redis` crate source code on GitHub: https://github.com/redis-rs/redis-rs
- Redis official documentation on Pub/Sub: https://redis.io/docs/latest/develop/interact/pubsub/
- crates.io `redis` crate page: https://crates.io/crates/redis

## Issues Found

### 1. `query_async` turbofish had wrong number of type parameters (compile error)
- **What was wrong:** The async example used `.query_async::<()>(&mut pub_con)`, but `query_async` has two type parameters `<C, T>` (connection type and return type). Providing only one type parameter causes a compile error.
- **What was changed:** Updated to `.query_async::<_, ()>(&mut pub_con)`, using `_` for the inferred connection type and `()` for the return type.

### 2. Missing `futures-util` dependency (compile error)
- **What was wrong:** The async Pub/Sub example imports `futures_util::StreamExt` to call `.next()` on the message stream, but `futures-util` was not listed in the `[dependencies]` section.
- **What was changed:** Added `futures-util = "0.3"` to the Setup dependencies block.

### 3. Unused import `redis::aio::PubSub`
- **What was wrong:** The async example imported `use redis::aio::PubSub;` but the type is never referenced directly in the code (the `pubsub` variable's type is inferred). This would produce an unused import warning.
- **What was changed:** Removed the unused import line.

## Review Notes
- The `redis` crate version 0.25 is quite outdated. The latest version is 1.2.0. The APIs used in this post work with 0.25 but readers should be aware that newer versions exist with significant changes.
- `client.get_async_connection()` used in the async example is deprecated in 0.25 in favor of `client.get_multiplexed_async_connection()`. However, multiplexed connections do not support `into_pubsub()`. The recommended approach for async pub/sub is `client.get_async_pubsub().await`. This was not changed since the current code works correctly with 0.25, but a future update should consider migrating to the newer API.
- In the pattern subscriptions example, `msg.get_pattern::<String>()` works but the crate documentation recommends using `Option<String>` as the type parameter (`msg.get_pattern::<Option<String>>()`), since non-pattern messages return `Value::Nil` which would error when converted to `String`.
- The subscribed connection command restrictions listed are correct for the common RESP2 case but omit `QUIT`, `RESET` (Redis 6.2+), `SSUBSCRIBE`, and `SUNSUBSCRIBE` (Redis 7.0+ sharded pub/sub). This is a minor omission that doesn't affect the tutorial's accuracy for typical use.
