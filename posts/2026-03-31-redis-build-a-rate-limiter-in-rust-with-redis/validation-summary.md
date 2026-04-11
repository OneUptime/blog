# Validation Summary: How to Build a Rate Limiter in Rust with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rust
- Redis
- redis-rs crate (v0.25)
- Tokio async runtime
- Lua scripting in Redis
- Axum web framework
- Sorted sets (ZADD, ZCARD, ZREMRANGEBYSCORE)
- Fixed window and sliding window rate limiting algorithms

## Sources Consulted
- redis-rs crate documentation (docs.rs/redis/0.25.0/redis/)
- redis-rs source code for `AsyncCommands` trait method signatures and `ScriptInvocation::invoke_async`
- Redis command reference for INCR, EXPIRE, ZADD, ZCARD, ZREMRANGEBYSCORE, TTL
- Rust type inference rules for generic return types (`FromRedisValue` trait)

## Issues Found
1. **Missing type annotation on `expire` call in Fixed Window section** — The call `self.pool.expire(&redis_key, self.window_secs as i64).await?;` would fail to compile because `expire` returns `RedisResult<RV>` where `RV: FromRedisValue` is generic, and Rust cannot infer the return type when the result is discarded without a binding. Fixed by adding `let _: () = ` prefix, consistent with how `expire` is called in all other code blocks in the post.

## Review Notes
- The `script` feature in the dependencies is valid but redundant — it is enabled by default in redis-rs 0.25. Not changed since it causes no harm and makes the dependency explicit.
- The sliding window implementation is not atomic (the ZREMRANGEBYSCORE, ZCARD, ZADD, and EXPIRE calls are separate commands). The post implicitly acknowledges this by showing the Lua-based atomic approach for the fixed window. A production sliding window would benefit from a similar Lua script, but this is a design consideration, not an error.
- The `unwrap_or(true)` in the Axum handler is a fail-open design choice (allow requests on Redis errors). This is a valid design decision for tutorials, though production systems may prefer fail-closed.
- The `reset_at` field in `RateLimitResult` stores TTL in seconds (from Redis TTL command), not a Unix timestamp. The naming is slightly ambiguous but not incorrect given the struct is internal.
