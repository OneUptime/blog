# Validation Summary: How to Create a Business KPI Dashboard Using OpenTelemetry Custom Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Metrics API
- OpenTelemetry Python metrics API
- OpenTelemetry Go metrics API
- OpenTelemetry Collector
- Prometheus remote write
- PromQL
- Grafana dashboards
- Mermaid

## Sources Consulted
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Go metrics API documentation: https://pkg.go.dev/go.opentelemetry.io/otel/metric
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Prometheus Remote Write exporter documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/prometheusremotewriteexporter
- OpenTelemetry naming guidelines: https://opentelemetry.io/docs/specs/semconv/general/naming/
- OpenTelemetry metric semantic conventions: https://opentelemetry.io/docs/specs/semconv/general/metrics/
- OpenTelemetry Prometheus/OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- Prometheus OpenTelemetry backend guide: https://prometheus.io/docs/guides/opentelemetry/
- Prometheus HTTP API remote write receiver documentation: https://prometheus.io/docs/prometheus/latest/querying/api/#remote-write-receiver

## Issues Found
- The post originally said the OpenTelemetry Metrics API provides three instrument types. The API provides more than three, including Gauge and asynchronous instruments. Changed the wording to say these are three instrument types that map especially well to business KPIs.
- The Go example did not import `go.opentelemetry.io/otel`, did not handle instrument creation errors, declared but did not use `err`, omitted the active cart UpDownCounter, and did not show current Go metric recording calls with `context.Context` and `metric.WithAttributes`. Updated the snippet to use the current Go metrics API and to compile in a normal Go project with OpenTelemetry dependencies installed.
- The Collector example sent Prometheus remote write data to an HTTP endpoint without the `tls.insecure: true` setting called out by the official Collector configuration docs for official Prometheus. Added that setting.
- The Collector section implied that only the OTLP receiver/exporter needed configuration. Prometheus remote write ingestion must be supported by the backend, and Prometheus requires the remote write receiver to be enabled. Added a sentence noting the required Collector distribution support and Prometheus receiver enablement.
- The naming section used `business.revenue.total` as a good example. OpenTelemetry naming guidance discourages `total` in metric names. Replaced it with `business.revenue.amount` and clarified that the unit belongs in instrument metadata.

## Review Notes
- I could not run a local Go compiler because `go` is not installed in this environment. The Go API usage was verified against the official `go.opentelemetry.io/otel/metric` package documentation.
- The PromQL examples are consistent with the default Prometheus-style translation of OpenTelemetry metric names, where dots become underscores, counters get a `_total` suffix, and histograms expose `_sum`, `_count`, and `_bucket` series.
