# Validation Summary: How to Propagate OpenTelemetry Trace Context in Rust

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- OpenTelemetry Rust API and SDK
- OpenTelemetry OTLP exporter
- tracing and tracing-opentelemetry
- Tokio async tasks
- Reqwest HTTP client
- Axum / Tower middleware
- W3C Trace Context propagation
- Message queue metadata propagation

## Sources Consulted
- OpenTelemetry Rust getting started documentation: https://opentelemetry.io/docs/languages/rust/getting-started/
- OpenTelemetry Propagators API specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- opentelemetry propagation module docs: https://docs.rs/opentelemetry/latest/opentelemetry/propagation/
- opentelemetry_sdk docs and feature flags: https://docs.rs/opentelemetry_sdk/latest/opentelemetry_sdk/
- opentelemetry_sdk TraceContextPropagator docs: https://docs.rs/opentelemetry_sdk/latest/opentelemetry_sdk/propagation/struct.TraceContextPropagator.html
- opentelemetry-otlp docs and changelog: https://docs.rs/opentelemetry-otlp/latest/opentelemetry_otlp/
- tracing-opentelemetry OpenTelemetrySpanExt docs: https://docs.rs/tracing-opentelemetry/latest/tracing_opentelemetry/trait.OpenTelemetrySpanExt.html
- tracing Instrument docs: https://docs.rs/tracing/latest/tracing/trait.Instrument.html
- axum middleware documentation: https://docs.rs/axum/latest/axum/middleware/

## Issues Found
- The dependency versions and OTLP setup code used older OpenTelemetry Rust APIs. Updated the crate versions to current compatible releases and replaced `new_pipeline()` / `new_exporter()` with `SpanExporter::builder()` and `SdkTracerProvider::builder()`.
- The OTLP feature flag `tonic` was outdated for the current crate. Replaced it with `grpc-tonic`.
- The setup example used the old `TracerProvider`, `Config`, and `runtime::Tokio` initialization style. Updated it to `SdkTracerProvider`, `Resource::builder()`, and `with_batch_exporter()`.
- The dependency list omitted `axum` even though the post includes Axum middleware examples. Added `axum = "0.8"`.
- The setup example did not register a text map propagator before examples used global injection/extraction. Added `TraceContextPropagator` registration.
- Several `set_parent` calls ignored the current `Result` return value from `tracing-opentelemetry`. Updated examples to explicitly discard the result with `let _ = ...`.
- The async task examples used `opentelemetry::Context::attach()` for spawned tasks while the code was creating spans through `tracing`. Replaced those examples with `tracing::Instrument` / `in_current_span()`, which is the correct propagation mechanism for `tracing` spans across spawned futures.
- The Tower middleware example held a span entered across an `.await`. Replaced `span.enter()` with `next.run(request).instrument(span).await`, matching tracing's async guidance.
- The Axum/Tower snippets used generic request imports that are not the current recommended Axum middleware signature. Updated them to use `axum::extract::Request`.

## Review Notes
The propagation concepts are accurate: W3C Trace Context uses `traceparent` and `tracestate`, OpenTelemetry propagators inject/extract context through carriers, and spawned Tokio tasks require explicit span propagation. The post remains version-specific; future OpenTelemetry Rust releases may require another API refresh.
