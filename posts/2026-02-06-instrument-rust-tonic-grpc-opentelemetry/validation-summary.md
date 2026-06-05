# Validation Summary: How to Instrument Rust Tonic gRPC Services with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rust
- Tonic gRPC
- Protocol Buffers
- Tokio
- Tower middleware
- OpenTelemetry Rust
- OTLP exporter
- tracing and tracing-subscriber
- tonic-tracing-opentelemetry

## Sources Consulted
- Tonic 0.11 crate documentation and interceptor API: https://docs.rs/tonic/0.11.0/tonic/
- Tonic-build 0.11 crate documentation: https://docs.rs/tonic-build/0.11.0/tonic_build/
- tonic-tracing-opentelemetry 0.18 crate documentation and README: https://docs.rs/tonic-tracing-opentelemetry/0.18.0/tonic_tracing_opentelemetry/
- tonic-tracing-opentelemetry 0.18 source for client and server middleware layers: https://docs.rs/crate/tonic-tracing-opentelemetry/0.18.0/source/
- opentelemetry-otlp 0.15 crate documentation and source: https://docs.rs/opentelemetry-otlp/0.15.0/opentelemetry_otlp/
- opentelemetry_sdk 0.22 crate features and runtime support: https://docs.rs/opentelemetry_sdk/0.22.1/opentelemetry_sdk/
- tracing-opentelemetry 0.23 crate documentation and OTLP example: https://docs.rs/tracing-opentelemetry/0.23.0/tracing_opentelemetry/
- OpenTelemetry gRPC semantic conventions: https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/trace/semantic_conventions/rpc.md

## Issues Found
- The dependency list omitted `tokio-stream`, even though the server-streaming example uses `tokio_stream::wrappers::ReceiverStream`. Added `tokio-stream = "0.1"`.
- The dependency list omitted `tower`, even though `tonic-tracing-opentelemetry` exposes Tower middleware layers for client and server instrumentation. Added `tower = "0.4"`.
- `opentelemetry_sdk::runtime::Tokio` requires the SDK `rt-tokio` feature. Updated the `opentelemetry_sdk` dependency to enable `rt-tokio`.
- The OpenTelemetry initialization returned and used `TracerProvider`, but `opentelemetry-otlp` 0.15 `install_batch(runtime::Tokio)` returns an SDK `Tracer` and installs the provider globally. Updated `init_tracer` to return `Tracer`, pass it directly to `tracing_opentelemetry::layer().with_tracer(...)`, and rely on `global::shutdown_tracer_provider()` for shutdown.
- The post used nonexistent `tonic_tracing_opentelemetry::layer()` and `tonic_tracing_opentelemetry::tracing_interceptor()` helpers for version 0.18. Replaced them with the documented `middleware::server::OtelGrpcLayer` and `middleware::client::OtelGrpcLayer` APIs.
- The server-streaming implementation omitted the generated trait's associated stream type. Added `type SayHelloStreamStream = tokio_stream::wrappers::ReceiverStream<Result<HelloReply, Status>>;`.
- The custom client example returned `GreeterClient<Channel>` even though `GreeterClient::with_interceptor` returns a client over an intercepted service. Added an explicit `InstrumentedGreeterClient` type and combined the OpenTelemetry Tower layer with the metadata interceptor.
- The error-handling snippet imported unused `tonic::Code`. Removed the unused import.
- The test snippet imported `tracing::Span` and checked `Span::current()` after the handler returned, which would not verify the handler's span context. Updated the test to create an `info_span`, run the call with `Instrument`, import `OpenTelemetrySpanExt`, and check that span's OpenTelemetry context.
- The architecture diagram and comments described the OpenTelemetry integration as Tonic interceptors. Updated those references to middleware where the post is discussing automatic OpenTelemetry instrumentation.

## Review Notes
The corrected examples target the crate versions listed in the post rather than the latest 2026 crate releases. Current releases of Tonic and OpenTelemetry Rust have newer APIs, so a future refresh could modernize the tutorial to Tonic 0.14, OpenTelemetry 0.32, and tonic-tracing-opentelemetry 0.38. Full compilation of the generated gRPC example was not possible in this environment because `protoc` is not installed, but the corrected OpenTelemetry initialization snippet was checked with Cargo against the listed crate versions.
