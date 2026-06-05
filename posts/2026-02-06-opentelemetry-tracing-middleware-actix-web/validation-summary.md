# Validation Summary: How to Add OpenTelemetry Tracing Middleware to Actix-web Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- Actix-web 4.x
- OpenTelemetry Rust API and SDK
- opentelemetry-otlp
- Distributed tracing middleware
- W3C Trace Context propagation

## Sources Consulted
- Actix-web middleware documentation: https://docs.rs/actix-web/latest/actix_web/middleware/
- OpenTelemetry Rust getting started documentation: https://opentelemetry.io/docs/languages/rust/getting-started/
- opentelemetry 0.22.0 API documentation: https://docs.rs/opentelemetry/0.22.0/opentelemetry/
- opentelemetry_sdk 0.22.1 API documentation: https://docs.rs/opentelemetry_sdk/0.22.1/opentelemetry_sdk/
- opentelemetry-otlp 0.15.0 API documentation: https://docs.rs/opentelemetry-otlp/0.15.0/opentelemetry_otlp/
- W3C Trace Context recommendation: https://www.w3.org/TR/trace-context/

## Issues Found
- The dependency list omitted `futures-util`, which is required for `LocalBoxFuture`. Added it.
- The dependency list omitted `serde` and `serde_json`, while later examples use JSON serialization and `serde_json::json!`. Added both dependencies.
- The application setup called `global::set_tracer_provider(tracer)` after `install_batch`. For `opentelemetry-otlp` 0.15, `install_batch` installs the tracer provider globally and returns a tracer, not a tracer provider. Removed the invalid call and retained the returned tracer as `_tracer`.
- The examples extracted headers using the global text-map propagator but never configured one. Added `global::set_text_map_propagator(TraceContextPropagator::new())` and corrected the troubleshooting text to say the W3C propagator must be configured explicitly.
- The custom handler span example used `req.extensions()` and `KeyValue` without importing `HttpMessage` and `KeyValue`. Added the missing imports.
- The background task example used `global::tracer`, `start_with_context`, `with_span`, and `span()` without the necessary imports. Added `global`, `Tracer`, and `TraceContextExt`.
- The background task example created a span but did not explicitly end it. Updated it to store the context and end the span after the background work finishes.
- The production configuration example imported `SamplingDecision` from the wrong module and did not import `WithExportConfig`, which is needed for `.with_endpoint(...)`. Replaced the incorrect import with the correct ones.

## Review Notes
The examples were checked by compiling representative snippets in a temporary Rust project using the article's dependency versions. The article still uses older OpenTelemetry Rust versions (`opentelemetry` 0.22 and `opentelemetry-otlp` 0.15); they work with the corrected snippets, but newer projects may prefer current crate versions and their newer setup APIs.
