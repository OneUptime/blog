# Validation Summary: How to Implement Long-Polling for Chat Apps in Rust

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rust
- Axum
- Tokio
- Tokio broadcast channels
- Tokio timeouts
- Serde
- UUID
- HTTP long-polling

## Sources Consulted
- Axum 0.7.9 `State` extractor documentation: https://docs.rs/axum/0.7.9/axum/extract/struct.State.html
- Axum `serve` documentation: https://docs.rs/axum/latest/axum/fn.serve.html
- Tokio `broadcast::Receiver` documentation: https://docs.rs/tokio/latest/tokio/sync/broadcast/struct.Receiver.html
- Tokio `broadcast::channel` documentation: https://docs.rs/tokio/latest/tokio/sync/broadcast/fn.channel.html
- Tokio `time::timeout` documentation: https://docs.rs/tokio/latest/tokio/time/fn.timeout.html
- UUID `Uuid::new_v4` documentation: https://docs.rs/uuid/latest/uuid/struct.Uuid.html#method.new_v4
- Cargo manifest documentation: https://doc.rust-lang.org/cargo/reference/manifest.html

## Issues Found
- The long-poll endpoint subscribed to the broadcast channel after checking the message store. Because Tokio broadcast receivers only receive values sent after subscription, a message could arrive between the store check and `subscribe()`, causing that poll request to miss the notification and wait until timeout. I moved `state.subscribe()` before the backlog check and added a short comment explaining why.

## Review Notes
- The corrected combined example was checked with `cargo check` using `axum 0.7.9`, Tokio 1.x, Serde, Serde JSON, and UUID dependencies. The code compiles successfully.
- The post uses `axum = "0.7"`, which resolves to `0.7.9`; Axum 0.8 is available, but the examples remain valid for the version specified in the post.
