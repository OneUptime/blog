# Validation Summary: How to Configure Non-Blocking OpenTelemetry Exporters for Actix-web with Tokio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- Actix-web
- Tokio
- OpenTelemetry Rust API
- OpenTelemetry SDK for Rust
- OpenTelemetry OTLP exporter
- tracing, tracing-opentelemetry, tracing-subscriber, and tracing-actix-web

## Sources Consulted
- OpenTelemetry Rust API 0.22.0 docs: https://docs.rs/opentelemetry/0.22.0/opentelemetry/
- OpenTelemetry Rust global trace API 0.22.0 docs and source: https://docs.rs/opentelemetry/0.22.0/opentelemetry/global/
- OpenTelemetry SDK 0.22.1 BatchConfig and BatchConfigBuilder docs/source: https://docs.rs/opentelemetry_sdk/0.22.1/opentelemetry_sdk/trace/struct.BatchConfig.html
- OpenTelemetry SDK 0.22.1 BatchSpanProcessor docs/source: https://docs.rs/opentelemetry_sdk/0.22.1/opentelemetry_sdk/trace/struct.BatchSpanProcessor.html
- OpenTelemetry OTLP 0.15.0 docs/source for exporter builders and install_batch: https://docs.rs/opentelemetry-otlp/0.15.0/opentelemetry_otlp/
- Rust crates.io dependency resolution and cargo check output for the corrected tracer initialization snippet.

## Issues Found
- `BatchConfig::default().with_*` was incorrect for `opentelemetry_sdk 0.22`; the `with_*` methods are provided by `BatchConfigBuilder`. Updated all batch configuration examples to use `BatchConfigBuilder::default()...build()`.
- The primary `init_non_blocking_tracer` example treated `install_batch` as returning a tracer provider and called `global::set_tracer_provider(tracer)`. In `opentelemetry-otlp 0.15`, `install_batch` returns an SDK `Tracer` and internally installs the provider globally. Updated the function to return the tracer and removed the invalid global provider call.
- The Actix-web integration example ignored the tracer returned by initialization and used `global::tracer("actix-web")` for the tracing layer. Updated it to pass the returned tracer directly to `tracing_opentelemetry::layer().with_tracer(...)`.
- The exporter failure example claimed to configure retry behavior with an unused `ExportConfig`, but that struct assignment did not configure retries and was not used. Removed the misleading retry block and narrowed the claim to graceful tracer initialization failure handling.
- Several snippets used `with_endpoint`, `with_timeout`, `runtime::Tokio`, `global::meter`, `Duration`, or OpenTelemetry SDK types without showing the required imports. Added the missing imports where needed.

## Review Notes
- The article is technically valid for the pinned OpenTelemetry Rust versions in its `Cargo.toml` snippet. Those versions are older than the latest available crates as of 2026-06-05, so a future refresh could update the tutorial to the newer OpenTelemetry Rust 0.32 API style.
- Verified the corrected main tracer initialization snippet with `cargo check` using `opentelemetry 0.22.0`, `opentelemetry_sdk 0.22.1`, `opentelemetry-otlp 0.15.0`, and `tracing-opentelemetry 0.23.0`.
