# Validation Summary: How to Build Microservices Architecture in Rust

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust (1.75)
- Cargo workspaces
- Axum 0.7 (HTTP framework)
- Tokio 1.35 (async runtime)
- Tonic 0.10 (gRPC)
- Protocol Buffers (proto3)
- Serde 1.0 (serialization)
- tracing / tracing-subscriber 0.1 (logging)
- `config` crate (environment-based configuration)
- reqwest (HTTP client)
- OpenTelemetry (OTLP exporter) + tracing-opentelemetry
- Docker (multi-stage builds, debian:bookworm-slim)
- Kubernetes (liveness / readiness probes, DNS-based service discovery)

## Sources Consulted
- Axum 0.7 docs: https://docs.rs/axum/0.7/axum/ (Router, `with_state`, `axum::serve`, `:param` path syntax)
- Tokio docs: https://docs.rs/tokio/1.35/tokio/ (`TcpListener::bind`, `RwLock`, `signal::ctrl_c`)
- Tonic 0.10 docs: https://docs.rs/tonic/0.10/tonic/ (`include_proto!`, `async_trait`, `Channel::from_shared`, `tonic_build::compile_protos`)
- tracing-subscriber docs: https://docs.rs/tracing-subscriber/ (`fmt::init`, `SubscriberInitExt`)
- opentelemetry / opentelemetry-otlp 0.13–0.14 docs (compatible with tonic 0.10): `new_pipeline().tracing()`, `with_exporter`, `with_trace_config`, `install_batch`, `opentelemetry::sdk::*` namespace (pre-0.21 layout)
- reqwest::Client::builder docs: `timeout`, `connect_timeout`, `pool_max_idle_per_host`
- `config` crate docs: https://docs.rs/config/ (`Config::builder`, `Environment::with_prefix`, `try_deserialize`)
- Protocol Buffers proto3 language guide: https://protobuf.dev/programming-guides/proto3/
- Docker multi-stage build documentation: https://docs.docker.com/build/building/multi-stage/
- Kubernetes probe documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/

## Issues Found
- **`tracing_subscriber::init()` does not exist as a free function.** The `tracing-subscriber` crate exposes the simple initializer as `tracing_subscriber::fmt::init()` (or `.init()` via the `SubscriberInitExt` trait on a configured subscriber). Fixed the call in the Axum `main()` example to `tracing_subscriber::fmt::init();` so the snippet compiles.

## Review Notes
- Pinned versions (axum 0.7, tonic 0.10, tokio 1.35, Rust 1.75) are internally consistent — they are all from the ~late-2023 release window. Newer Axum 0.8 changed path parameter syntax from `:id` to `{id}`; the `:id` form shown is correct for 0.7.
- The OpenTelemetry snippet uses the pre-0.21 namespace layout (`opentelemetry::sdk::trace`, `opentelemetry::runtime::Tokio`). This matches the opentelemetry 0.20 / opentelemetry-otlp 0.13 era that pairs with tonic 0.10. If readers upgrade to opentelemetry 0.21+, those paths move to the `opentelemetry_sdk` crate and the pipeline builder API changes — worth flagging in any future revision.
- The Dockerfile uses lowercase `as` in `FROM rust:1.75-slim as builder`. Modern BuildKit prefers uppercase `AS` and emits a warning, but lowercase still builds correctly.
- The "Putting It All Together" snippet references `AppState::new`, `handlers::api_routes`, `health::health_routes`, `TraceLayer`, and `config.otlp_endpoint` which are not defined elsewhere in the post; this is acceptable as a sketch but readers should be aware these are stubs.
- The `OrderClient::get_orders_for_user` example references `Order` and `ClientError` types without defining them — clearly illustrative.
- All other code samples (Axum handlers, Tonic server implementation, reqwest builder, `config` crate usage, Docker multi-stage layout, Kubernetes probe pattern) match official documentation for the pinned versions.
