# Validation Summary: How to Set Up OpenTelemetry Tracing in Rust

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
- Tokio
- reqwest
- SQLx

## Sources Consulted
- OpenTelemetry OTLP Rust crate documentation: https://docs.rs/opentelemetry-otlp/latest/opentelemetry_otlp/
- OpenTelemetry SDK Rust crate documentation: https://docs.rs/opentelemetry_sdk/latest/opentelemetry_sdk/
- tracing-opentelemetry crate documentation: https://docs.rs/tracing-opentelemetry/latest/tracing_opentelemetry/
- tracing `#[instrument]` documentation: https://docs.rs/tracing/latest/tracing/attr.instrument.html
- tracing `Instrument` documentation: https://docs.rs/tracing/latest/tracing/trait.Instrument.html
- tracing span lifecycle documentation: https://docs.rs/tracing/latest/tracing/span/
- OpenTelemetry Rust `Status` documentation: https://docs.rs/opentelemetry/latest/opentelemetry/trace/enum.Status.html
- OpenTelemetry Rust `Span` trait documentation: https://docs.rs/opentelemetry/latest/opentelemetry/trace/trait.Span.html
- OpenTelemetry SDK `ShouldSample` documentation: https://docs.rs/opentelemetry_sdk/latest/opentelemetry_sdk/trace/trait.ShouldSample.html
- OpenTelemetry trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- SQLx crate documentation: https://docs.rs/sqlx/latest/sqlx/
- sqlx-tracing crate documentation: https://docs.rs/sqlx-tracing/latest/sqlx_tracing/
- sqlx-otel crate documentation: https://docs.rs/sqlx-otel/latest/sqlx_otel/

## Issues Found
- The dependency versions and OTLP initialization code used older OpenTelemetry Rust APIs (`new_pipeline`, `new_exporter`, `install_batch`, `runtime::Tokio`). Updated the post to current crate versions and the current `SpanExporter::builder()` / `SdkTracerProvider` setup.
- The basic setup used `global::shutdown_tracer_provider()`, which is not the current shutdown pattern for the updated SDK setup. Changed the example to keep the `SdkTracerProvider` and call `shutdown()` on it.
- The `#[instrument]` explanation said return values are captured by default. Corrected it to say arguments are captured by default and `ret` / `err` must be used for return values or errors.
- The manual span example held entered span guards across `.await` points. Reworked it to use `tracing::Instrument`, matching the async guidance in the tracing documentation.
- The layered tracing example created a JSON layer but did not register it with the subscriber, while the prose claimed JSON logs were sent to stderr. Added `.with(json_layer)`.
- The custom attributes example used `Span::record` as if it could add new fields dynamically. Changed it to use `OpenTelemetrySpanExt::set_attribute` for OpenTelemetry span attributes.
- The HTTP propagation snippet used an outdated fully qualified extension call style and imported an unused propagator trait. Updated it to use `Span::current().context()` with the extension trait in scope.
- The error-status snippet attempted to treat `span_context()` as an `Option` and set status through the OpenTelemetry context incorrectly. Replaced it with `OpenTelemetrySpanExt::set_status(Status::error(...))`.
- The sampling setup used the old OTLP pipeline APIs. Updated it to the current provider/exporter setup and added `Clone, Debug` derives required by the current `ShouldSample` trait bounds.
- The SQLx example claimed SQLx automatically creates query spans when tracing is enabled. Adjusted the wording to state that SQLx emits tracing-based query logs and that SQLx tracing/OpenTelemetry integration crates are needed for per-query spans.

## Review Notes
The corrected OpenTelemetry setup and related propagation/status/sampler snippets were compile-checked in a temporary Rust project with `opentelemetry 0.32`, `opentelemetry_sdk 0.32`, `opentelemetry-otlp 0.32`, `tracing-opentelemetry 0.33`, `tracing-subscriber 0.3`, `tokio 1.x`, and `reqwest 0.12`. Some later examples still use placeholder application types such as `User`, `AuthError`, and `Order`, so they are illustrative snippets rather than standalone programs.
