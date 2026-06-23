# Validation Summary: How to Structure Logs Properly in Rust with tracing and OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- tracing
- tracing-subscriber
- tracing-opentelemetry
- OpenTelemetry Rust SDK
- OpenTelemetry OTLP exporter
- Tokio
- JSON structured logging
- serde / serde_json

## Sources Consulted
- tracing-subscriber fmt layer documentation: https://docs.rs/tracing-subscriber/latest/tracing_subscriber/fmt/struct.Layer.html
- tracing-subscriber JSON formatter documentation: https://docs.rs/tracing-subscriber/latest/tracing_subscriber/fmt/format/struct.Json.html
- tracing-opentelemetry crate documentation: https://docs.rs/tracing-opentelemetry/latest/tracing_opentelemetry/
- tracing-opentelemetry OpenTelemetrySpanExt documentation: https://docs.rs/tracing-opentelemetry/latest/tracing_opentelemetry/trait.OpenTelemetrySpanExt.html
- opentelemetry-otlp crate documentation: https://docs.rs/opentelemetry-otlp/latest/opentelemetry_otlp/
- opentelemetry-otlp feature flags: https://docs.rs/crate/opentelemetry-otlp/latest/features
- opentelemetry-otlp changelog: https://docs.rs/crate/opentelemetry-otlp/latest/source/CHANGELOG.md
- opentelemetry_sdk crate documentation: https://docs.rs/opentelemetry_sdk/latest/opentelemetry_sdk/
- opentelemetry_sdk feature flags: https://docs.rs/crate/opentelemetry_sdk/latest/features
- opentelemetry-semantic-conventions resource documentation: https://docs.rs/opentelemetry-semantic-conventions/latest/opentelemetry_semantic_conventions/resource/index.html
- OpenTelemetry Rust getting started documentation: https://opentelemetry.io/docs/languages/rust/getting-started/
- OpenTelemetry traces concept documentation: https://opentelemetry.io/docs/concepts/signals/traces/

## Issues Found
- The OpenTelemetry dependency versions and setup used older APIs. Updated `tracing-opentelemetry`, `opentelemetry`, `opentelemetry_sdk`, and `opentelemetry-otlp` to the current compatible crate family and replaced removed `new_pipeline()` / `new_exporter()` usage with `SpanExporter::builder()` and `SdkTracerProvider::builder()`.
- The OpenTelemetry resource example referenced `DEPLOYMENT_ENVIRONMENT`, which is not available as written in the current semantic conventions crate. Replaced it with the current deployment environment attribute key and kept stable service semantic constants.
- The shutdown example used `opentelemetry::global::shutdown_tracer_provider()`, which does not match the current provider-builder example. Updated the initializer to return `SdkTracerProvider` and the shutdown function to call `shutdown()` on it.
- The post claimed OpenTelemetry automatically adds trace context to JSON logs. Clarified that `tracing-opentelemetry` exports spans and that explicit log trace IDs require a custom formatter or appender.
- The `#[instrument]` explanation said the macro logs function entry/exit. Corrected it to say it creates a span; span lifecycle logging depends on subscriber configuration.
- The custom JSON formatter attempted to implement `Default` for `serde_json::Value`, which violates Rust's orphan rules. Replaced it with a `Default` implementation for the local `JsonVisitor` type.
- The custom trace context extraction used `opentelemetry::Context::current()`, which does not reliably read the current `tracing` span's OpenTelemetry context. Updated it to use `tracing_opentelemetry::OpenTelemetrySpanExt` on `tracing::Span::current()`.
- The custom JSON visitor did not record floating-point fields. Added `record_f64` so fields such as payment amounts remain structured JSON numbers.
- The example output wording implied standard JSON logging would include `service`, `trace_id`, and `span_id`. Updated it to indicate this output requires a custom JSON formatter that includes service and trace context.

## Review Notes
The updated OpenTelemetry and custom formatter examples were compile-checked in a temporary Cargo project using the current crate versions. The check completed successfully with only expected unused-code warnings from isolated example functions.
