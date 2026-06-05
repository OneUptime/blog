# Validation Summary: How to Instrument Rust Axum Applications with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Rust
- Axum
- Tokio
- Tower and tower-http
- tracing and tracing-subscriber
- tracing-opentelemetry
- OpenTelemetry Rust SDK
- OTLP export
- reqwest
- UUID request IDs

## Sources Consulted
- Axum 0.8 routing and path parameter documentation: https://docs.rs/axum/latest/axum/struct.Router.html
- Axum extractor documentation for `FromRequestParts`: https://docs.rs/axum/latest/axum/extract/trait.FromRequestParts.html
- tower-http request ID documentation: https://docs.rs/tower-http/latest/tower_http/request_id/index.html
- tower-http `RequestId` and `MakeRequestUuid` documentation: https://docs.rs/tower-http/latest/tower_http/request_id/struct.RequestId.html and https://docs.rs/tower-http/latest/tower_http/request_id/struct.MakeRequestUuid.html
- tracing-opentelemetry 0.33 documentation and examples: https://docs.rs/tracing-opentelemetry/latest/tracing_opentelemetry/
- opentelemetry-otlp 0.32 documentation and changelog: https://docs.rs/opentelemetry-otlp/latest/opentelemetry_otlp/ and https://github.com/open-telemetry/opentelemetry-rust/blob/main/opentelemetry-otlp/CHANGELOG.md
- opentelemetry SDK tracer provider documentation: https://docs.rs/opentelemetry_sdk/latest/opentelemetry_sdk/trace/struct.SdkTracerProvider.html
- OpenTelemetry span status documentation: https://docs.rs/opentelemetry/latest/opentelemetry/trace/enum.Status.html
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- Local verification with `cargo check` using Axum 0.8, tower-http 0.6, OpenTelemetry 0.32, opentelemetry-otlp 0.32, and tracing-opentelemetry 0.33.

## Issues Found
- The dependency set used older Axum, tower-http, and OpenTelemetry crate versions and omitted crates used later in the post. Updated the examples to Axum 0.8, tower-http 0.6, OpenTelemetry 0.32, tracing-opentelemetry 0.33, and added `reqwest` and `uuid`.
- The OpenTelemetry OTLP setup used removed `new_pipeline()`, `new_exporter()`, and `install_batch()` APIs. Replaced them with `SpanExporter::builder()`, `SdkTracerProvider::builder()`, and explicit provider shutdown.
- The telemetry setup did not install a text-map propagator, while later examples relied on extraction and injection. Added `TraceContextPropagator::new()` in the setup examples.
- The custom middleware held a `tracing` span guard across `.await`, which is unsafe for async tracing correctness. Replaced it with `.instrument(span.clone())`.
- The custom middleware used older HTTP semantic convention attributes such as `http.method`, `http.target`, `http.host`, and `http.status_code`. Updated them to stable names such as `http.request.method`, `url.path`, `server.address`, and `http.response.status_code`.
- The custom middleware used the old OpenTelemetry status enum construction. Updated it to `Status::error(...)`.
- The Axum route example used `"/users/:id"`, which panics under Axum 0.8 route checks. Updated it to `"/users/{id}"`.
- The context extractor used the removed `axum::async_trait` pattern. Updated it to Axum 0.8's native async trait method implementation.
- The request ID example manually implemented UUID generation despite tower-http providing `MakeRequestUuid`, and the layer order would not reliably expose the request ID to `TraceLayer`. Replaced it with `MakeRequestUuid` and `tower::ServiceBuilder` in the documented order.
- The outbound reqwest example used `global` and `#[instrument]` without importing them. Added the missing imports.
- The state and error-handling examples needed current OpenTelemetry trait imports and span status API usage. Updated those snippets.

## Review Notes
The corrected representative code was checked with `cargo check` in an isolated temporary project. The post remains an illustrative tutorial rather than a single copy-paste application, so some snippets still rely on types or handlers introduced in nearby sections.
