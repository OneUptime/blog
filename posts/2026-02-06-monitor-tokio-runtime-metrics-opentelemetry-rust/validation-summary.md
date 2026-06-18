# Validation Summary: How to Monitor Tokio Runtime Metrics with OpenTelemetry in Rust

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Rust
- Tokio
- tokio-metrics
- OpenTelemetry Rust
- OTLP
- Prometheus
- Grafana
- tracing

## Sources Consulted
- tokio-metrics 0.5.0 documentation: https://docs.rs/tokio-metrics/0.5.0/tokio_metrics/
- tokio-metrics RuntimeMetrics documentation: https://docs.rs/tokio-metrics/0.5.0/tokio_metrics/struct.RuntimeMetrics.html
- tokio-metrics TaskMetrics and TaskMonitor documentation: https://docs.rs/tokio-metrics/0.5.0/tokio_metrics/struct.TaskMetrics.html and https://docs.rs/tokio-metrics/0.5.0/tokio_metrics/struct.TaskMonitor.html
- tokio-metrics official README: https://github.com/tokio-rs/tokio-metrics
- Tokio RuntimeMetrics documentation: https://docs.rs/tokio/latest/tokio/runtime/struct.RuntimeMetrics.html
- OpenTelemetry OTLP Rust crate documentation: https://docs.rs/opentelemetry-otlp/0.32.0/opentelemetry_otlp/
- OpenTelemetry metrics Meter documentation: https://docs.rs/opentelemetry/0.32.0/opentelemetry/metrics/struct.Meter.html
- OpenTelemetry SDK metrics documentation and local crate source for SdkMeterProvider: https://docs.rs/opentelemetry_sdk/0.32.0/opentelemetry_sdk/metrics/
- OpenTelemetry Prometheus Rust crate documentation: https://docs.rs/opentelemetry-prometheus/0.32.0/opentelemetry_prometheus/
- crates.io metadata via `cargo search` / `cargo info` for current crate versions.

## Issues Found
- Updated outdated crate versions and feature flags for current OpenTelemetry Rust, tokio-metrics, tracing-opentelemetry, Prometheus, and Warp APIs.
- Replaced obsolete OpenTelemetry OTLP setup using `new_exporter().tonic().build_metrics_exporter(...)` and manual `PeriodicReader` construction with the current `MetricExporter::builder().with_tonic().build()` plus `SdkMeterProvider::builder().with_periodic_exporter(...)` pattern.
- Replaced deprecated or removed instrument builder `.init()` calls with current `.build()` calls.
- Added the required `tokio_unstable` build configuration because many runtime metrics used in the post are unstable Tokio metrics.
- Corrected invalid tokio-metrics field names such as `total_spawned_tasks_count`, `mean_scheduled_duration`, `active_tasks_count`, `num_idle_blocking_threads`, `num_blocking_threads`, and `mean_polls_count` to current fields such as `total_polls_count`, `live_tasks_count`, `idle_blocking_threads_count`, `blocking_queue_depth`, and `budget_forced_yield_count`.
- Removed the incorrect derivation of completed task counts from runtime metrics. The current runtime metrics do not expose task completions in the way the original snippet assumed.
- Corrected worker metrics naming: `total_noop_count` measures no-op wakeups, not worker unparks.
- Updated the Prometheus exporter example to use a `prometheus::Registry`, install the exporter as a metric reader, and gather from the registry.
- Updated Grafana metric examples to match the corrected metric names.

## Review Notes
Compiler verification was attempted in a scratch Cargo project but could not complete because the filesystem ran out of disk space while compiling dependencies. The final review therefore relied on official docs, current crate metadata, and local crate source already present in the Cargo registry.
