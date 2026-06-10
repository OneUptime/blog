# Validation Summary: How to Build Real-time Applications with Rust

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust (2021 edition)
- Tokio async runtime (1.35)
- Axum web framework (0.7) with `ws` feature
- tokio-tungstenite (0.21) for WebSocket client testing
- futures-util (0.3) for `SinkExt`/`StreamExt`
- Server-Sent Events (SSE) via `axum::response::sse`
- async-stream for the SSE stream macro
- Redis crate for pub/sub multi-server scaling
- tracing / tracing-subscriber for logging
- serde / serde_json for serialization
- uuid (v4) for client IDs

## Sources Consulted
- tracing-subscriber 0.3 docs: https://docs.rs/tracing-subscriber/0.3/tracing_subscriber/
- axum 0.7 WebSocket Message enum: https://docs.rs/axum/0.7/axum/extract/ws/enum.Message.html
- axum 0.7 `serve::Serve`: https://docs.rs/axum/0.7/axum/serve/struct.Serve.html
- axum 0.7 SSE module (`Event`, `KeepAlive`, `Sse`): https://docs.rs/axum/0.7/axum/response/sse/
- redis 0.24 async PubSub: https://docs.rs/redis/0.24.0/redis/aio/struct.PubSub.html
- tokio-tungstenite 0.21 `connect_async`: https://docs.rs/tokio-tungstenite/0.21.0/tokio_tungstenite/fn.connect_async.html

## Issues Found
1. **Incorrect tracing-subscriber init call.** The original code in the main server example used `tracing_subscriber::init();`, but `tracing-subscriber` 0.3 does not export a top-level `init()` function. The standard initializer lives in the `fmt` module. Changed to `tracing_subscriber::fmt::init();` so the example actually compiles.

## Review Notes
- The `axum::extract::ws::Message` variants used (`Text(String)`, `Ping(Vec<u8>)`, `Pong(Vec<u8>)`, `Close(...)`) are correct for axum 0.7. Note: axum 0.8 changed these to use `Utf8Bytes`/`Bytes` — if the post is updated to a newer axum in the future, the `Text`/`Ping`/`Pong` payload construction will need to change.
- The SSE `Event::data(json)` call works because `json` is a `String` (which implements `AsRef<str>`). Readers passing a serde struct directly would need `.json_data(value)` instead.
- The Cargo.toml does not list `async-stream` (used by the SSE handler) or `redis` (used by the scaling section). These are introduced inline with separate code blocks, so it is consistent with a "scaffold then extend" tutorial flow, but readers will need to add them when copying those snippets.
- The `tower-http` dependency with the `cors` feature is declared but never actually wired up in the code. Harmless but unused.
- The connection-limit handler has a small TOCTOU race between `load` and `fetch_add` (two threads can each observe `current < MAX_CONNECTIONS` and both increment). Acceptable for a tutorial; a `compare_exchange` loop would be more correct in production.
- The graceful-shutdown example references `listener` and `app` that were defined in the earlier `main` snippet; treated as continuation context, which is fine for a tutorial.
- The `redis::Client::get_async_connection` method is deprecated in newer redis-rs versions in favor of `get_multiplexed_async_connection`, but it still exists and works in 0.24. No fix needed for the stated dependency version.
