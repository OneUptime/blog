# Validation Summary: How to Use Redis Transactions in Rust

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (MULTI/EXEC transactions, WATCH optimistic locking)
- Rust
- `redis` crate (version 0.25)
- Tokio (async runtime)

## Sources Consulted
- [redis 0.25.0 ErrorKind enum - docs.rs](https://docs.rs/redis/0.25.0/redis/enum.ErrorKind.html) - Verified all 24 ErrorKind variants; confirmed `TxAbortedError` does not exist.
- [redis 0.25.0 Pipeline struct - docs.rs](https://docs.rs/redis/0.25.0/redis/struct.Pipeline.html) - Verified `atomic()`, `query()`, `query_async()`, `ignore()` method signatures.
- [redis 0.25.0 Client struct - docs.rs](https://docs.rs/redis/0.25.0/redis/struct.Client.html) - Confirmed `get_connection()` and `get_multiplexed_async_connection()` are not deprecated.
- [redis 0.25.0 transaction function - docs.rs](https://docs.rs/redis/0.25.0/redis/fn.transaction.html) - Verified WATCH/MULTI/EXEC retry pattern uses `Option<T>` to detect nil EXEC responses.
- [redis-rs pipeline.rs source - GitHub](https://github.com/redis-rs/redis-rs/blob/main/redis/src/pipeline.rs) - Confirmed that nil EXEC response (WATCH abort) is returned as `Ok(from_redis_value(Value::Nil))`, not as a specific error kind.
- [Redis Transactions documentation](https://redis.io/docs/latest/develop/using-commands/transactions/) - Verified Redis transaction semantics: no rollback on runtime errors, WATCH causes nil EXEC on conflict.

## Issues Found

### Issue 1 (Critical): Non-existent `ErrorKind::TxAbortedError` variant
- **What was wrong:** The WATCH example used `redis::ErrorKind::TxAbortedError` to detect aborted transactions. This variant does not exist in the `redis` crate's `ErrorKind` enum (verified against all 24 variants in v0.25.0). The code would fail to compile.
- **What was changed:** Replaced the error-matching approach with the correct `Option<T>` pattern. When EXEC returns nil due to a WATCH conflict, the redis crate deserializes it as `None` (when the result type is `Option<T>`). Changed the result type from `redis::RedisResult<(i64,)>` to `Option<(i64,)>` and updated the match arms from `Ok(_)`/`Err(TxAbortedError)` to `Some(_)`/`None`. Also updated the explanatory text after the code block.
- **Why:** The redis crate's pipeline code explicitly handles nil EXEC responses by returning `Ok(from_redis_value(Value::Nil))`. When the target type is `Option<T>`, `Value::Nil` deserializes to `None`. This is the same pattern used internally by the `redis::transaction()` helper function.

### Issue 2 (Minor): Missing `.ignore()` in async example
- **What was wrong:** The async pipeline example called `.set()` and `.expire()` without `.ignore()`, meaning the pipeline would produce a 2-tuple result. Since `query_async` returns a generic `RedisResult<T>` and the result was discarded (`?;`), the compiler cannot infer the result type `T`, potentially causing a "type annotations needed" error.
- **What was changed:** Added `.ignore()` after both `.set()` and `.expire()` calls, matching the pattern already used in the `transfer_points` function earlier in the post.
- **Why:** With `.ignore()` on all commands, the pipeline result is empty and can be deserialized as `()`, resolving the type inference issue.

## Review Notes
- The post correctly explains that Redis transactions do not support rollback on runtime errors, which is a common misconception.
- The `redis::transaction()` helper function exists as a higher-level alternative to manual WATCH/MULTI/EXEC loops and handles the retry logic automatically. The post's manual approach is educational but readers building production code may prefer the helper.
- The `redis = "0.25"` dependency is a valid version. As of the review date, newer versions exist (0.27+) with some API renames (e.g., `TypeError` -> `UnexpectedReturnType`, `ResponseError` -> `Parse`), but the code in this post targets 0.25 and is correct for that version after the fixes applied.
