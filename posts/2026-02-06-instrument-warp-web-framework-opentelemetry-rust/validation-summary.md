# Validation Summary: How to Instrument Warp Web Framework with OpenTelemetry in Rust

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rust
- Warp web framework
- OpenTelemetry Rust SDK
- OTLP exporter
- tracing
- tracing-subscriber
- tracing-opentelemetry
- Tokio
- WebSocket handling

## Sources Consulted
- Warp crate documentation and feature flags: https://docs.rs/warp/latest/warp/
- Warp `Filter` trait documentation: https://docs.rs/warp/latest/warp/trait.Filter.html
- Warp tracing filter documentation and source: https://docs.rs/warp/latest/warp/filters/trace/
- OpenTelemetry OTLP exporter documentation: https://docs.rs/opentelemetry-otlp/latest/opentelemetry_otlp/
- OpenTelemetry SDK `SdkTracerProvider` documentation: https://docs.rs/opentelemetry_sdk/latest/opentelemetry_sdk/trace/struct.SdkTracerProvider.html
- tracing `#[instrument]` documentation: https://docs.rs/tracing/latest/tracing/attr.instrument.html
- tracing-opentelemetry documentation: https://docs.rs/tracing-opentelemetry/latest/tracing_opentelemetry/
- Crates.io metadata checked with `cargo info` for `warp`, `opentelemetry`, `opentelemetry_sdk`, `opentelemetry-otlp`, `tracing-opentelemetry`, and `opentelemetry-semantic-conventions`.

## Issues Found
- The dependency block used older crate versions and missed current Warp features needed by the examples. Updated Warp to `0.4` with `server`, `test`, and `websocket` features; OpenTelemetry crates to `0.32`; `tracing-opentelemetry` to `0.33`; and added `futures-util` for WebSocket stream/sink extensions.
- The OpenTelemetry initialization used the old `new_pipeline().tracing().install_batch(runtime::Tokio)` API. Replaced it with the current `SpanExporter::builder().with_tonic()` and `SdkTracerProvider::builder().with_batch_exporter(...)` APIs.
- The tracer provider was not installed globally in the corrected setup. Added `opentelemetry::global::set_tracer_provider(provider.clone())`.
- The custom `with_tracing()` Warp filter only created a span during the pre-route filter closure, so downstream handlers would not run inside that request span. Replaced it with Warp's `warp::trace::trace` / `warp::trace::request()` wrapper, which instruments the route future.
- Several route return types used `Extract = impl warp::Reply`, which is not sufficient when combining those filters with other filters such as the timing middleware. Updated route signatures to `Extract = (impl warp::Reply,)` where needed.
- The timing middleware incorrectly declared `Extract = ()` and called `.untuple_one()` after mapping an `Instant`. Fixed it to return `Extract = (Instant,)`.
- The rejection handler used `else if let Some(Unauthorized) = err.find()`, which does not match the API shape correctly. Changed it to `err.find::<Unauthorized>().is_some()`.
- The WebSocket example imported `StreamExt` and `SinkExt` from `futures` without listing that dependency. Updated it to use `futures_util::{SinkExt, StreamExt}` and added the dependency.
- The auth test expected a 401 from a route without applying the rejection handler. Updated the test route to use `.recover(handle_rejection)`.
- The section heading and text claimed trace propagation tests, but the sample tests only exercised traced routes and rejection handling. Renamed the heading and description to match the code.
- The complete application called both global shutdown and provider shutdown. Removed the global shutdown call and retained `provider.shutdown()?` for the current SDK provider.

## Review Notes
Representative corrected examples were compiled in a temporary Cargo project against current crates. `cargo test --no-run` passed for the assembled Warp/OpenTelemetry example; the earlier test run also passed for the route and auth examples. The post still demonstrates tracing rather than full inbound W3C trace-context extraction from HTTP headers; that would require an additional propagation example if the article is expanded later.
