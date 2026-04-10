# Validation Summary: How to Use Redis Streams in Rust

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Streams
- Rust
- `redis` crate (version 0.25)
- Tokio async runtime

## Sources Consulted
- redis crate v0.25.0 streams module docs: https://docs.rs/redis/0.25.0/redis/streams/index.html
- redis crate v0.25.0 Commands trait (xadd, xadd_maxlen, xread_options, xack, xpending): https://docs.rs/redis/0.25.0/redis/trait.Commands.html
- redis crate v0.25.0 StreamMaxlen enum: https://docs.rs/redis/0.25.0/redis/streams/enum.StreamMaxlen.html
- redis crate v0.25.0 StreamPendingReply enum: https://docs.rs/redis/0.25.0/redis/streams/enum.StreamPendingReply.html
- redis crate v0.25.0 StreamPendingData struct: https://docs.rs/redis/0.25.0/redis/streams/struct.StreamPendingData.html
- redis crate v0.25.0 Client struct (async connection methods): https://docs.rs/redis/0.25.0/redis/struct.Client.html
- redis crate v0.25.0 StreamReadOptions: https://docs.rs/redis/0.25.0/redis/streams/struct.StreamReadOptions.html

## Issues Found

### Issue 1: `StreamAddOptions` and `xadd_options` do not exist in redis 0.25

**What was wrong:** The blog used `redis::streams::StreamAddOptions` and called `con.xadd_options()` with `StreamAddOptions::default().max_len(redis::streams::StreamMaxlen::Approx(1000))`. The `StreamAddOptions` struct and `xadd_options` method do not exist in the redis crate v0.25.

**What was changed:** Replaced the import with `use redis::streams::StreamMaxlen;` and changed the method call to `con.xadd_maxlen("orders", StreamMaxlen::Approx(1000), "*", &[...])`, which is the correct API. Note the parameter order for `xadd_maxlen` is: key, maxlen, id, items.

**Why:** The correct method for appending to a capped stream in redis 0.25 is `xadd_maxlen`, which takes a `StreamMaxlen` enum directly as its second parameter.

### Issue 2: `StreamPendingReply` is an enum, not a struct with direct field access

**What was wrong:** The blog accessed `pending.count`, `pending.start_id`, and `pending.end_id` directly on a `StreamPendingReply` value. However, `StreamPendingReply` is an enum with two variants: `Empty` and `Data(StreamPendingData)`. The fields `count`, `start_id`, and `end_id` belong to the inner `StreamPendingData` struct and cannot be accessed directly on the enum.

**What was changed:** Replaced direct field access with a `match` expression that handles both `StreamPendingReply::Data(data)` (accessing `data.count`, `data.start_id`, `data.end_id`) and `StreamPendingReply::Empty`.

**Why:** The original code would not compile. Pattern matching is required to extract the `StreamPendingData` from the `Data` variant before accessing its fields.

## Review Notes
- The `"streams"` feature in the Cargo.toml dependency is redundant since it is included in the default features for redis 0.25, but specifying it explicitly is harmless and makes the dependency on streams functionality explicit, so it was left as-is.
- All other API usage (`xadd`, `xread_options`, `xgroup_create_mkstream`, `xack`, `StreamReadOptions` builder pattern, `StreamReadReply` structure, `get_multiplexed_async_connection`) was verified correct against the v0.25.0 documentation.
- The async example correctly uses `get_multiplexed_async_connection()` which is the recommended non-deprecated async connection method.
