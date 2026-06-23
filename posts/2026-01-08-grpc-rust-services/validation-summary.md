# Validation Summary: How to Build gRPC Services in Rust

## Status
validated

## Post Type
Tutorial / Guide — a step-by-step walkthrough of building a production-style gRPC service in Rust with Tonic.

## Technologies Covered
- Rust (edition 2021)
- Tonic 0.11 (gRPC framework)
- Prost 0.12 / prost-types (Protocol Buffers code generation)
- Tokio 1.x async runtime and tokio-stream
- tonic-build 0.11 (build-time codegen)
- tonic-health 0.11, tonic-reflection 0.11
- Tower (middleware layers) and the `http` crate
- async-stream, futures
- thiserror / anyhow error handling
- tracing / tracing-subscriber
- Docker (multi-stage build)

## Sources Consulted
- Tonic docs and crate metadata — https://docs.rs/tonic / https://crates.io/crates/tonic/0.11.0
- tonic-build API (configure/compile vs compile_protos) — https://docs.rs/tonic-build
- tokio-stream wrappers feature flags (BroadcastStream → `sync`, TcpListenerStream → `net`) — https://docs.rs/tokio-stream/latest/tokio_stream/wrappers/index.html
- tonic dependency versions for 0.11 (http 0.2, tower 0.4, hyper 0.14) — crates.io / hyperium/tonic GitHub
- prost enum/`TryFrom<i32>` generation behavior — https://docs.rs/prost

## Issues Found
1. **Missing dependencies in `Cargo.toml`.** The service code imports `futures::Stream` and uses the `async_stream::try_stream!` macro, and the logging interceptor imports `tower::{Layer, Service}` and `http::Request` / `http::Response`. None of `futures`, `async-stream`, `tower`, or `http` were declared. Added them to `Cargo.toml`. The `tower` and `http` versions were pinned to `0.4` and `0.2` respectively so they match the versions used internally by Tonic 0.11 (Tonic 0.11 is built on http 0.2 / tower 0.4 / hyper 0.14; 0.12+ moved to http 1.0). Mismatched major versions would cause the `http::Request`/`http::Response<BoxBody>` types in the Tower `Service` impl to be incompatible with Tonic's transport.

2. **`tokio-stream` feature flags.** The dependency was declared as `tokio-stream = "0.1"` (default features = `time` only), but the code uses `BroadcastStream` (requires the `sync` feature) and `TcpListenerStream` (requires the `net` feature, used in the integration tests). Updated the declaration to `features = ["net", "sync"]`.

3. **`#[derive(Default)]` on `UserStore` does not compile.** `UserStore` holds a `broadcast::Sender<UserEvent>`, and `tokio::sync::broadcast::Sender` does not implement `Default`, so the derive would fail. Since a manual `UserStore::new()` is provided and used everywhere (`Arc::new(UserStore::new())`), removed `Default` from the derive, leaving `#[derive(Debug)]`.

## Review Notes
- The `build.rs` uses `tonic_build::configure().compile(...)`. This is correct for tonic-build 0.11; the method was only renamed to `compile_protos()` in 0.12 (with `compile()` kept as a deprecated alias). No change needed.
- prost enum naming (`USER_STATUS_UNSPECIFIED` → `UserStatus::Unspecified`, etc.) and the `TryFrom<i32>` conversions used in `list_users` are accurate for prost 0.12.
- The Dockerfile `HEALTHCHECK` invokes `grpcurl`, but `grpcurl` is not installed in the `debian:bookworm-slim` runtime stage, so as written the health check would always fail. This was left as-is because correcting it is a deployment/tooling choice (install `grpcurl`, or switch to `grpc-health-probe`) rather than a core-code error; readers should add the probe binary to the runtime image.
- `tonic-reflection` is listed as a dependency and `build.rs` writes the file-descriptor set, but `server.rs` never registers the reflection service. This is harmless (unused capability) and intentional per the "optional" comment, so it was left unchanged.
- The in-memory `UserStore` is explicitly a demo store; the duplicate-detection loop is O(n) per insert, which is fine for a tutorial but should be backed by a real database/index in production, as the post notes.
