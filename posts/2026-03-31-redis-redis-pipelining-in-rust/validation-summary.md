# Validation Summary: How to Use Redis Pipelining in Rust

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (pipelining, MULTI/EXEC transactions)
- Rust
- `redis` crate (version 0.25)
- Tokio async runtime

## Sources Consulted
- Official `redis` crate documentation on docs.rs: https://docs.rs/redis/0.25.0/redis/struct.Pipeline.html
- `redis::pipe()` documentation: https://docs.rs/redis/0.25.0/redis/fn.pipe.html
- `redis::Client` documentation: https://docs.rs/redis/0.25.0/redis/struct.Client.html
- Redis pipelining documentation: https://redis.io/docs/latest/develop/use/pipelining/

## Issues Found

### Issue 1: Missing `.ignore()` on SET in synchronous pipeline example
**What was wrong:** The synchronous pipeline example chained 4 commands (SET, GET, INCR, EXISTS) but destructured the result into a 3-tuple `(String, i64, bool)`. In the `redis` crate, every pipeline command produces a result by default. SET returns "OK", so without `.ignore()`, 4 results would be produced, causing a runtime type mismatch.
**What was changed:** Added `.ignore()` after `.set("key1", "hello")` so the SET result is discarded and only the 3 remaining results (GET, INCR, EXISTS) populate the tuple.

### Issue 2: Missing `.ignore()` and incorrect return type in atomic pipeline example
**What was wrong:** The atomic pipeline example had 2 SET commands but destructured the result into a 1-tuple `(bool,)`. Two SET commands produce 2 results, not 1. Additionally, binding SET results to a named variable wasn't useful here since the example only demonstrates atomic execution.
**What was changed:** Added `.ignore()` after both `.set()` calls and removed the unused `(updated,): (bool,)` binding, since the example's purpose is to show atomic execution, not to capture results.

### Issue 3: Inconsistent method name in async section description
**What was wrong:** The introductory text for the async section said "use `get_async_connection()`" but the actual code correctly used `get_multiplexed_async_connection()`. The method `get_async_connection()` is a different (non-multiplexed) method.
**What was changed:** Updated the text to say `get_multiplexed_async_connection()` to match the code.

## Review Notes
- The `use std::time::Instant;` import in the benchmarking snippet is unused within the shown code, but this is acceptable since the snippet is clearly a fragment intended for the reader to wrap with timing logic.
- The `use redis::Commands;` import in the synchronous example is not strictly needed for pipeline operations (pipeline methods are inherent on `Pipeline`, not from the `Commands` trait), but it is harmless and would be needed if the reader extends the example with direct connection commands.
- The 10-50x performance claim for pipelining is reasonable for local Redis with 1,000 commands, as this aligns with Redis's own documentation on pipelining benefits.
- The `redis` crate version 0.25 and `tokio-comp` feature are current and correct.
