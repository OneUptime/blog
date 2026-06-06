# Validation Summary: How to Build a Custom OpenTelemetry Span Exporter in Rust

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rust
- OpenTelemetry Rust API
- OpenTelemetry Rust SDK
- Custom span exporters
- Tokio
- JSON serialization with serde
- HTTP exporting with reqwest

## Sources Consulted
- OpenTelemetry Rust SDK 0.22.1 `SpanExporter` and `SpanData` source: https://docs.rs/opentelemetry_sdk/0.22.1/opentelemetry_sdk/export/trace/
- OpenTelemetry Rust SDK 0.22.1 batch span processor source: https://docs.rs/opentelemetry_sdk/0.22.1/opentelemetry_sdk/trace/
- OpenTelemetry Rust API `Tracer` and `TraceContextExt` docs: https://docs.rs/opentelemetry/latest/opentelemetry/trace/
- OpenTelemetry Rust repository and release information: https://github.com/open-telemetry/opentelemetry-rust
- Local compile check against `opentelemetry = 0.22.0` and `opentelemetry_sdk = 0.22.1`

## Issues Found
- The post described and implemented `SpanExporter` as an `async-trait` trait with `async fn export`, but SDK 0.22 defines `export` as a synchronous method returning `BoxFuture<'static, ExportResult>`. Updated the explanation and exporter implementations.
- The `SpanExporter` trait in SDK 0.22 also includes `force_flush` and requires implementors to satisfy `Debug`, `Send`, and `Sync`. Updated the explanation and added `Debug` support to exporter structs.
- The dependency list omitted crates used by later examples (`futures-util`, `futures-executor`, `reqwest`, and `colored`) and included unnecessary `async-trait`. Updated the dependency snippet.
- The batch configuration example incorrectly chained builder methods on `BatchConfig::default()`. Replaced it with `BatchConfigBuilder::default().with_...().build()`.
- The setup example used `with_span`, `span`, and `span_builder` without importing the required OpenTelemetry trace extension traits. Added `TraceContextExt` and `Tracer` imports.
- The HTTP and multi-exporter examples constructed `TraceError::Other` from strings, which does not match the enum variant type. Replaced those with `TraceError::from(...)`.
- The test `SpanData` initializer omitted SDK 0.22 fields (`dropped_attributes_count` and `resource`) and used plain vectors for `events` and `links`, which are `SpanEvents` and `SpanLinks` in SDK 0.22. Updated the test snippet.

## Review Notes
The article remains version-specific to OpenTelemetry Rust 0.22. As of this review date, the OpenTelemetry Rust project has newer 0.32.x releases with changed exporter APIs, so a future modernization pass should update the whole tutorial rather than mixing current APIs into the 0.22 examples.
