# Validation Summary: How to Build Event-Driven Systems in Rust

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust (language fundamentals: enums, traits, async)
- `std::sync::mpsc` (synchronous multi-producer single-consumer channels)
- Tokio (`tokio::sync::broadcast`, `tokio::spawn`, `tokio::sync::RwLock`, `tokio::time::sleep`)
- `async-trait` crate
- `serde` / `serde_json` (serialization)
- `chrono` (timestamps)
- `uuid` crate
- `futures` crate (`join_all`)
- `futures_lite::stream::StreamExt`
- `lapin` crate (RabbitMQ AMQP 0.9.1 client)
- `rand` crate
- `std::sync::atomic` (AtomicU64, Ordering)

## Sources Consulted
- Rust standard library docs: https://doc.rust-lang.org/std/sync/mpsc/
- Tokio broadcast channel docs: https://docs.rs/tokio/latest/tokio/sync/broadcast/
- Tokio sync docs: https://docs.rs/tokio/latest/tokio/sync/
- async-trait crate docs: https://docs.rs/async-trait/
- lapin crate docs (v2.x): https://docs.rs/lapin/
- lapin source for `Confirmation` and `PublisherConfirm` semantics (NotRequested returned when `confirm_select` is not called)
- Rust `Duration` arithmetic: `impl Mul<u32> for Duration` (std::time::Duration)
- serde / serde_json docs: https://serde.rs/
- chrono docs: https://docs.rs/chrono/
- uuid docs: https://docs.rs/uuid/
- futures crate docs: https://docs.rs/futures/

## Issues Found

1. **EventMetrics: incorrect import** — The metrics example imported `std::time::Instant`, which was unused, while it actually needed `std::time::Duration` for the `record_success(processing_time: Duration)` parameter. Changed `use std::time::Instant;` to `use std::time::Duration;`.

2. **RabbitMQProducer: missing `confirm_select` call** — The producer matched on `Confirmation::Ack(_)` in its `publish` method, but publisher confirms were never enabled on the channel. In lapin, `basic_publish` only returns `Confirmation::Ack`/`Nack` when the channel has confirm mode enabled via `channel.confirm_select(...)`. Without that call, the inner future resolves to `Confirmation::NotRequested`, which would fall into the `_` arm and cause every publish to incorrectly return `lapin::Error::InvalidChannelState`. Added a `channel.confirm_select(ConfirmSelectOptions::default()).await?;` call in `RabbitMQProducer::new` so the match works as the post advertises. `ConfirmSelectOptions` is already in scope via the existing `options::*` glob import.

## Review Notes
- The post is otherwise technically accurate: enum design, `std::sync::mpsc` semantics, Tokio broadcast subscribe/recv pattern, `async_trait` usage, `Arc<dyn Trait>` for type-erased handlers, atomic counters with `Ordering::Relaxed`, `Duration * u32` arithmetic, and lapin's `basic_publish().await.await` double-await pattern (PublisherConfirm is itself a future) are all correct.
- Minor stylistic notes (not changed):
  - The `with_retry` function uses `rand::random::<u64>()` without an explicit `use rand;`. This compiles because `rand::random` is a path expression, but it implicitly assumes the `rand` crate is in `Cargo.toml`. Acceptable for a tutorial.
  - `delay = delay * 2 + ...` can grow unbounded and will eventually panic on `Duration` overflow if retries continue without a cap; in practice the `max_retries` guard prevents this. Worth a comment in production code.
  - The `with_retry` example's `delay` doubling lacks a max-cap; production backoff usually clamps to a maximum delay. Out of scope for a tutorial.
  - In the broadcast example, the initial `_rx` is dropped immediately — fine because new receivers are obtained via `tx.subscribe()` before the send, but a reader might wonder why it exists at all. Style-only.
  - `with_delivery_mode(2)` is the documented value for persistent messages in AMQP 0.9.1 / lapin's `BasicProperties`. Correct.
  - `Confirmation::NotRequested` could also be treated as success in some setups; the chosen approach of opting into confirms is the more pedagogically clear fix for this post.
