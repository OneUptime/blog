# Validation Summary: How to Migrate from Prometheus Client Libraries to OpenTelemetry Metrics SDK

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- OpenTelemetry Metrics SDK
- OpenTelemetry Go API and SDK
- OpenTelemetry OTLP metric exporter for gRPC
- OpenTelemetry Prometheus exporter
- Prometheus Go client library
- Go metrics instrumentation

## Sources Consulted
- OpenTelemetry Go documentation: https://opentelemetry.io/docs/languages/go/
- OpenTelemetry Go exporters documentation: https://opentelemetry.io/docs/languages/go/exporters/
- OpenTelemetry Metrics SDK specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry Go metric API package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/metric
- OpenTelemetry Go SDK metric package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/metric
- OpenTelemetry Go OTLP metric gRPC exporter documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc
- OpenTelemetry Go Prometheus exporter documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/prometheus
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry HTTP semantic convention migration notes: https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/
- Prometheus histograms and summaries documentation: https://prometheus.io/docs/practices/histograms/
- Prometheus Go client package documentation: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus

## Issues Found
- The gauge mapping omitted the current synchronous OpenTelemetry Go Gauge instrument and stated that directly set Prometheus gauges map to observable gauges. Updated the mapping and added a synchronous `Int64Gauge` example using `Record`.
- The summary mapping said percentiles could be configured through SDK views. Updated it to say percentiles are calculated in the backend or query layer, while SDK views can configure aggregation details such as histogram buckets.
- The SDK initialization snippet imported `log` without using it, which would make the full Go snippet fail to compile. Removed the unused import.
- The semantic convention package import used `semconv/v1.21.0`, which is outdated for a current 2026 post. Updated it to `semconv/v1.41.0` based on current OpenTelemetry Go package examples.
- The OpenTelemetry counter and histogram examples used older HTTP attributes `http.method` and `http.status_code`. Updated them to current semantic convention attributes `http.request.method` and `http.response.status_code`, using an integer status code attribute.
- The Prometheus compatibility section implied that the OpenTelemetry Prometheus exporter itself serves `/metrics`. Updated the text and snippet to show that the exporter is registered as a metric reader and that a Prometheus `promhttp.Handler()` must be exposed for scraping.

## Review Notes
The Go toolchain is not installed in this workspace, so snippets could not be compiled locally. Validation was performed against official OpenTelemetry and Prometheus documentation. The migration guidance is now technically accurate, but a future improvement would be to include complete import blocks for every standalone snippet if the blog wants copy-paste runnable examples.
