# Validation Summary: How to Implement Caching Strategies in Rust

## Status
validated

## Post Type
Tutorial / Guide — practical walkthrough with multiple code examples building progressively more sophisticated caching solutions in Rust.

## Technologies Covered
- Rust (std collections, sync primitives, raw pointers, atomics)
- `std::collections::HashMap` and `std::sync::RwLock`
- `std::ptr::NonNull` and unsafe Rust for doubly-linked-list LRU
- Moka crate (`moka::future::Cache`, v0.12, with `future` feature)
- redis-rs crate (`redis`, v0.24, with `tokio-comp` and `connection-manager` features)
- Tokio async runtime
- `serde` / `serde_json` for serialization
- `rand` crate (`thread_rng`, `gen_bool`)
- Cache patterns: cache-aside / lazy-loading, two-tier (local + distributed), probabilistic early expiration (cache-stampede mitigation)

## Sources Consulted
- Moka 0.12 future::Cache and CacheBuilder docs: https://docs.rs/moka/0.12.0/moka/future/struct.Cache.html and https://docs.rs/moka/0.12.0/moka/future/struct.CacheBuilder.html
- Moka eviction listener signature `Fn(Arc<K>, V, RemovalCause) + Send + Sync + 'static`
- redis-rs 0.24 docs: https://docs.rs/redis/0.24.0/redis/ — verified `Client::open`, `get_multiplexed_async_connection`, `AsyncCommands::{get, set_ex, del, ttl}`, and `set_ex(key, value, seconds: u64)` signature
- Rust std lib: `impl<T: ?Sized + Display> Display for Arc<T>` (confirms `println!("{}", arc_key)` compiles when key is `Arc<u64>`)
- Rust std `Option::map`, `NonNull` (Copy + PartialEq via pointer equality), `Box::from_raw`/`Box::into_raw`
- `rand::Rng::gen_bool` semantics — panics if probability not in [0.0, 1.0]; code clamps with `.min(1.0)` and the formula never produces negative values
- Cache-aside / lazy-loading pattern definitions (AWS / standard caching literature)
- XFetch / probabilistic early-expiration concept for stampede mitigation

## Issues Found
1. **Inaccurate probability comments in `should_refresh_early`** — The original comment claimed "At 20% remaining: ~5% chance, at 5% remaining: ~20% chance." With the actual formula `0.05 / remaining_ratio.max(0.01)`, the values are: 20% remaining → 25%, 10% remaining → 50%, 5% remaining → 100% (capped). Updated the comment to reflect the real values produced by the formula.
2. **Mislabeled "exponential decay"** — The same function header described the curve as "exponential decay," but the math `c / x` is a hyperbolic / inverse relationship, not exponential. Rewrote the comment to describe the behavior accurately (probability grows inversely with remaining TTL) without changing the formula itself.

No other technical errors found. The HashMap+RwLock cache, the unsafe LRU implementation (move-to-front, evict-from-tail, Drop cleanup), the Moka builder configuration, the redis-rs async commands, the two-tier cache-aside flow, and the atomic metrics wrapper all check out against current crate APIs and standard caching literature.

## Review Notes
- The Moka example marks `create_user_cache` as `async fn` but never awaits anything inside — moka's `CacheBuilder::build()` is synchronous. Not incorrect, just unnecessary.
- The Moka eviction listener `println!("Evicted user {}: ...", key, ...)` relies on `Display for Arc<T> where T: Display` — this works for `Arc<u64>` but would not work if a future reader switched to a key type that only implements `Debug`. Worth keeping in mind but not a bug.
- The redis-rs `Cargo.toml` enables the `connection-manager` feature but the code uses `get_multiplexed_async_connection` (multiplexed connections, not the ConnectionManager). The feature is harmless but unused — could be dropped in a future cleanup.
- The unsafe LRU is correct but, as the post itself notes, real production code should reach for a maintained crate (`lru`, `mini-moka`, `moka`, `quick_cache`). The educational value of the from-scratch implementation justifies its inclusion.
- The `set_ex` API in redis-rs has shifted between versions (`usize` vs `u64`, argument order). The post pins `redis = "0.24"` and uses the 0.24 signature `set_ex(key, value, seconds: u64)`, which matches `ttl.as_secs()` returning `u64`. If a reader bumps to a newer version, they should double-check this call site.
- The probabilistic refresh constant `0.05` is somewhat aggressive (yielding 100% probability once you cross ~5% remaining). The classic XFetch algorithm uses a slightly different formulation; the current code is a reasonable simplification and the comments now match the math.
