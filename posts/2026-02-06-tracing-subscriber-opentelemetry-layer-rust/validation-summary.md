# Validation Summary: How to Use tracing-subscriber with OpenTelemetry Layer in Rust

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Rust
- tracing
- tracing-subscriber
- tracing-opentelemetry
- OpenTelemetry Rust SDK
- OTLP exporter
- Tokio
- Jaeger OTLP ingestion

## Sources Consulted
- OpenTelemetry OTLP Rust exporter docs: https://docs.rs/opentelemetry-otlp/0.32.0/opentelemetry_otlp/
- OpenTelemetry Rust SDK `SdkTracerProvider` docs: https://docs.rs/opentelemetry_sdk/0.32.1/opentelemetry_sdk/trace/struct.SdkTracerProvider.html
- OpenTelemetry Rust SDK `Resource` docs: https://docs.rs/opentelemetry_sdk/0.32.1/opentelemetry_sdk/struct.Resource.html
- tracing-opentelemetry 0.33 docs: https://docs.rs/tracing-opentelemetry/0.33.0/tracing_opentelemetry/
- tracing-subscriber layer and reload docs: https://docs.rs/tracing-subscriber/0.3.23/tracing_subscriber/
- opentelemetry-jaeger deprecation notice: https://docs.rs/opentelemetry-jaeger/0.22.0/opentelemetry_jaeger/
- Crates.io metadata checked with `cargo info` for `opentelemetry`, `opentelemetry_sdk`, `opentelemetry-otlp`, `tracing-opentelemetry`, `tracing-subscriber`, and `tokio`.

## Issues Found
- The dependency versions and examples used the older OpenTelemetry Rust pipeline API (`new_pipeline().tracing().install_batch(...)`). Updated dependencies to the current compatible crate line and changed examples to use `SpanExporter::builder()`, `SdkTracerProvider::builder()`, and provider-created tracers.
- The examples used `Resource::new(...)`, which is no longer public in current `opentelemetry_sdk`. Replaced it with `Resource::builder().with_service_name(...).with_attributes(...).build()`.
- The multiple-backend example used the deprecated `opentelemetry-jaeger` exporter and Jaeger agent endpoint. Replaced it with Jaeger OTLP ingestion through `opentelemetry-otlp`.
- The shutdown examples used the removed `opentelemetry::global::shutdown_tracer_provider()` function. Updated examples to keep and shut down the returned `SdkTracerProvider`.
- The reload example returned an incorrect `reload::Handle` type for the layer stack order. Reordered the reloadable format layer so `reload::Handle<EnvFilter, Registry>` is correct.
- The environment-filter comments contradicted the code by saying OpenTelemetry was unfiltered while the code applied the filter. Updated the comments to match the behavior.
- The performance section overstated layer-order filtering behavior and understated the overhead of multiple exporters. Updated those claims to match tracing-subscriber and exporter behavior.

## Review Notes
- Representative updated examples were type-checked in a temporary Cargo project with `cargo check`.
- The examples assume a Tokio runtime is available for the OTLP tonic exporter and that a collector or Jaeger OTLP endpoint is listening on the configured endpoint.
