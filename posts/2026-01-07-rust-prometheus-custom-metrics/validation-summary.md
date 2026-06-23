# Validation Summary: How to Add Custom Metrics to Rust Applications with Prometheus

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rust
- prometheus Rust crate
- Prometheus metrics and PromQL
- Axum
- Tokio
- Grafana

## Sources Consulted
- prometheus crate documentation: https://docs.rs/prometheus
- prometheus Registry documentation: https://docs.rs/prometheus/latest/prometheus/struct.Registry.html
- prometheus 0.13.4 process collector source and examples from the installed crate source
- Axum Router documentation: https://docs.rs/axum/latest/axum/routing/struct.Router.html
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus histograms and summaries documentation: https://prometheus.io/docs/practices/histograms/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The dependency block omitted crates used by the complete Rust example: `tracing`, `tracing-subscriber`, `serde`, and `uuid`. Added those dependencies so the shown Axum application can compile when copied as written.
- The process metrics example implied process metrics were generally available. In the `prometheus` crate version used by the post, the default process collector is gated behind the `process` feature and Linux target support. Updated the comment to say "Linux process metrics."

## Review Notes
- Verified the combined Rust snippets with `cargo check` using `prometheus` 0.13.x and `axum` 0.7.x after adding the missing dependencies. The example compiled with warnings only for intentionally unused tutorial code.
- The `/api/orders/:id` route syntax is correct for the pinned Axum 0.7 version. Axum 0.8 uses brace-style path parameters such as `/api/orders/{id}`, so this should be revisited if the post is later updated to Axum 0.8.
