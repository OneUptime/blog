# Validation Summary: How to Migrate from actix-web-opentelemetry to the New Instrumentation Crate

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Rust
- Actix Web
- awc
- OpenTelemetry Rust API and SDK
- OTLP exporter
- opentelemetry-instrumentation-actix-web
- tracing and tracing-opentelemetry
- tracing-subscriber

## Sources Consulted
- docs.rs: actix-web-opentelemetry crate page, noting replacement guidance: https://docs.rs/crate/actix-web-opentelemetry/latest
- docs.rs: opentelemetry-instrumentation-actix-web 0.23.0 crate and RequestTracing docs: https://docs.rs/opentelemetry-instrumentation-actix-web/latest/opentelemetry_instrumentation_actix_web/
- docs.rs: tracing-actix-web 0.7.21 crate docs and OpenTelemetry feature compatibility: https://docs.rs/tracing-actix-web/latest/tracing_actix_web/
- docs.rs: opentelemetry-otlp 0.31.x / latest exporter builder examples: https://docs.rs/opentelemetry-otlp/latest/opentelemetry_otlp/
- docs.rs: opentelemetry_sdk trace provider, sampler, resource, and metrics APIs: https://docs.rs/opentelemetry_sdk/latest/opentelemetry_sdk/
- docs.rs: tracing-opentelemetry 0.32.1 compatibility and examples: https://docs.rs/crate/tracing-opentelemetry/0.32.1
- docs.rs: OpenTelemetry global API and metrics examples: https://docs.rs/opentelemetry/latest/opentelemetry/global/
- OpenTelemetry trace SDK specification for sampling behavior: https://opentelemetry.io/docs/specs/otel/trace/sdk/

## Issues Found
- The post described `tracing-actix-web` as the replacement crate. The deprecated crate points users to `opentelemetry-instrumentation-actix-web`, so the dependency list and middleware examples were updated to use `opentelemetry_instrumentation_actix_web::RequestTracing`.
- The dependency versions used outdated OpenTelemetry 0.22 / OTLP 0.15 APIs. Updated the examples to the compatible OpenTelemetry 0.31, OTLP 0.31, instrumentation 0.23, and tracing-opentelemetry 0.32 set.
- The OTLP trace initialization used the removed `new_pipeline().tracing().install_batch(...)` API. Replaced it with `SpanExporter::builder()`, `SdkTracerProvider::builder()`, `with_batch_exporter`, and explicit tracer provider shutdown.
- The outbound HTTP example used `actix_web::client::Client`, which is not the Actix Web 4 client API. Replaced it with `awc::Client` and `ClientExt::trace_request()`.
- The custom sampler snippet was missing current trait bounds/imports. Added `Clone` and `Debug`, imported sampling types from `opentelemetry::trace`, and imported `ShouldSample` from the SDK.
- The metrics snippet used old exporter, runtime, resource, and counter APIs. Updated it to `MetricExporter::builder()`, `PeriodicReader::builder(exporter)`, `Resource::builder()`, and counter `.build()`.
- The performance section included unsupported benchmark percentages. Replaced the precise claim with guidance to benchmark in the target service.

## Review Notes
The corrected examples are version-specific to the OpenTelemetry 0.31 ecosystem because `opentelemetry-instrumentation-actix-web` 0.23.0 depends on OpenTelemetry 0.31. A full `cargo check` was attempted in a temporary project, but the local filesystem ran out of space during compilation; verification was completed against official docs and downloaded crate sources.
