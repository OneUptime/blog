# Validation Summary: How to Trace Reqwest HTTP Client Calls with OpenTelemetry in Rust

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- Reqwest
- reqwest-middleware
- reqwest-tracing
- OpenTelemetry Rust
- tracing and tracing-subscriber
- Tokio async runtime
- W3C Trace Context
- Wiremock

## Sources Consulted
- Reqwest 0.11.27 crate documentation and source: https://docs.rs/reqwest/0.11.27/reqwest/
- reqwest-middleware 0.2.5 crate documentation and source: https://docs.rs/reqwest-middleware/0.2.5/reqwest_middleware/
- reqwest-tracing 0.4.8 crate metadata and documentation: https://docs.rs/reqwest-tracing/0.4.8/reqwest_tracing/
- opentelemetry-otlp 0.15.0 crate documentation and source: https://docs.rs/opentelemetry-otlp/0.15.0/opentelemetry_otlp/
- tracing-opentelemetry 0.23.0 crate metadata and documentation: https://docs.rs/tracing-opentelemetry/0.23.0/tracing_opentelemetry/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/
- JSONPlaceholder API examples: https://jsonplaceholder.typicode.com/

## Issues Found
- The Reqwest dependency did not enable the `stream` feature, but the streaming example uses `Response::bytes_stream()`. Added `"stream"` to the Reqwest feature list because that method is feature-gated.
- The dependency list omitted `futures`, which is required by the `join_all` and `StreamExt` examples. Added `futures = "0.3"`.
- The test example uses `wiremock` but the dependency list did not include it. Added `wiremock = "0.6"` under `[dev-dependencies]`.
- The OpenTelemetry initialization example returned `opentelemetry_sdk::trace::TracerProvider`, but `opentelemetry-otlp` 0.15 `install_batch(runtime::Tokio)` returns `opentelemetry_sdk::trace::Tracer`. Updated the return type, variable names, tracer layer setup, and shutdown examples accordingly.
- Functions using `ClientWithMiddleware` returned `reqwest::Error`, but `reqwest-middleware` request execution returns `reqwest_middleware::Error`. Updated affected function signatures and the batch result type.
- `ApiError` only converted from `reqwest::Error`, which prevented middleware request errors from compiling. Updated `RequestFailed` to use `reqwest_middleware::Error` and added a `ResponseFailed` variant for response/body handling errors that still produce `reqwest::Error`.
- JSONPlaceholder uses `userId` in JSON payloads, while the Rust structs used `user_id` without serde renaming. Added `#[serde(rename = "userId")]` to the request and response structs.
- The streaming example imported `reqwest::Response` without using it. Removed the unused import.

## Review Notes
The corrected examples were type-checked in a scratch Rust project using the post's pinned crate versions plus the added dependencies. The pinned OpenTelemetry and Reqwest stack is older than the latest crates available in 2026, but the tutorial remains technically valid for the specified versions after these fixes.
