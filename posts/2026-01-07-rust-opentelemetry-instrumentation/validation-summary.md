# Validation Summary: How to Instrument Rust Applications with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- OpenTelemetry Rust API and SDK
- opentelemetry-otlp
- tracing
- tracing-subscriber
- tracing-opentelemetry
- opentelemetry-appender-tracing
- Tokio
- Axum
- OTLP

## Sources Consulted
- OpenTelemetry Rust getting started documentation: https://opentelemetry.io/docs/languages/rust/getting-started/
- OpenTelemetry Rust repository and examples: https://github.com/open-telemetry/opentelemetry-rust
- opentelemetry crate documentation: https://docs.rs/opentelemetry/latest
- opentelemetry_sdk crate documentation: https://docs.rs/opentelemetry_sdk/latest/opentelemetry_sdk/
- opentelemetry-otlp crate documentation: https://docs.rs/opentelemetry-otlp/latest/opentelemetry_otlp/
- tracing-opentelemetry crate documentation: https://docs.rs/tracing-opentelemetry/latest/tracing_opentelemetry/
- opentelemetry-appender-tracing crate documentation: https://docs.rs/opentelemetry-appender-tracing/latest/opentelemetry_appender_tracing/
- tracing `#[instrument]` documentation: https://docs.rs/tracing/latest/tracing/attr.instrument.html
- tracing `Span::record` documentation: https://docs.rs/tracing/latest/tracing/struct.Span.html
- Axum documentation: https://docs.rs/axum/latest/axum/
- Axum 0.8 path syntax change notes: https://tokio.rs/blog/2025-01-01-announcing-axum-0-8-0
- Crates.io current package versions for opentelemetry, opentelemetry_sdk, opentelemetry-otlp, tracing-opentelemetry, and opentelemetry-appender-tracing

## Issues Found
- **Outdated OpenTelemetry Rust dependency versions.** The post used `opentelemetry` / `opentelemetry_sdk` `0.24`, `opentelemetry-otlp` `0.17`, semantic conventions `0.16`, and `tracing-opentelemetry` `0.25`. Updated the dependency snippet to current compatible versions (`0.32` / `0.33`) and added missing dependencies for logging and the Axum example.
- **Removed OTLP pipeline APIs.** The examples used `opentelemetry_otlp::new_pipeline()`, `new_exporter()`, `.tracing()`, `.logging()`, and `.install_batch(...)`, which are no longer the current API. Replaced them with `SpanExporter::builder()`, `MetricExporter::builder()`, `LogExporter::builder()`, `SdkTracerProvider`, `SdkMeterProvider`, and `SdkLoggerProvider`.
- **Invalid semantic convention constants.** The original code imported `DEPLOYMENT_ENVIRONMENT` from `opentelemetry_semantic_conventions::resource`, but the current stable resource module exposes `deployment.environment.name` only behind an experimental feature. Replaced it with the literal current attribute name.
- **Tracer provider lifetime and shutdown were incorrect.** The original code returned only a tracer and used `global::shutdown_tracer_provider()`, which is not available in the current API. Added a `TelemetryGuard` that keeps the provider alive and shuts it down explicitly.
- **Metrics provider lifetime and exporter setup were incorrect.** The original metrics code created an unused exporter, called a removed `build_metrics_exporter` API, used `.init()` instead of `.build()`, and dropped the meter provider at the end of initialization. Updated it to use `PeriodicReader`, retain the provider in `AppMetrics`, and set the global meter provider.
- **OpenTelemetry logs were not connected to `tracing` events.** The original logging code created a logger provider but did not install a tracing-to-OpenTelemetry log bridge. Added `opentelemetry-appender-tracing` and `OpenTelemetryTracingBridge`.
- **`tracing::Span::record` was used on an undeclared field.** Added `order.step = tracing::field::Empty` so later `record("order.step", ...)` calls update the span as intended.
- **Axum path syntax was outdated.** Replaced `/api/orders/:id` with `/api/orders/{id}` for Axum 0.8.
- **HTTP status metric attribute type was wrong.** Changed `http.status_code` from a string value to an integer value.
- **Production sampler snippet imported a non-existent type.** Replaced `TraceIdRatioBased::new(0.1)` with `Sampler::TraceIdRatioBased(0.1)` inside `Sampler::ParentBased`.
- **Overstated claims.** Adjusted "disabled spans compile to no-ops" and "single dependency for traces, metrics, and logs" to reflect the current `tracing` and OpenTelemetry Rust model more accurately.

## Review Notes
- I verified the corrected tracing, metrics, logging, and Axum snippets in a temporary Cargo project using the dependency versions shown in the post. `cargo check` completed successfully; the temporary harness produced only unused-code warnings.
- The post uses a custom `OTLP_ENDPOINT` environment variable in code. The official OTLP exporter also supports standard `OTEL_EXPORTER_OTLP_*` variables; keeping `OTLP_ENDPOINT` is acceptable because the code explicitly reads it.
