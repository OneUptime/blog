# Validation Summary: How to Build Latency-Based Alerts Using OpenTelemetry Histogram Percentiles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry metrics SDK
- OpenTelemetry Python SDK
- OpenTelemetry Go SDK
- OpenTelemetry Collector
- Prometheus exporter
- Prometheus histograms, recording rules, alerting rules, and PromQL

## Sources Consulted
- OpenTelemetry Python SDK metrics view documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.view.html
- OpenTelemetry Go SDK metric package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/metric
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector Prometheus exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusexporter/README.md
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- Prometheus histogram and summary best practices: https://prometheus.io/docs/practices/histograms/
- Prometheus histogram_quantile function documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/

## Issues Found
- The Python OTLP gRPC exporter example used `endpoint="otel-collector:4317"` without an `http` scheme or `insecure=True`. The OTLP exporter specification says insecure mode defaults to false unless an `http` scheme or insecure option is used. Updated the endpoint to `http://otel-collector:4317` so the local Collector example uses plaintext gRPC as intended.
- The Prometheus exporter configuration commented that metrics would be emitted with an `otel_` prefix, and all PromQL examples queried `otel_http_server_request_duration_seconds_bucket`, but the config did not set a namespace. Added `namespace: otel` so the documented metric names match the Collector configuration.
- The `le="+Inf"` bucket explanation said Prometheus linearly interpolates within the infinity bucket. Prometheus documents that if a classic histogram quantile falls in the highest bucket, it returns the upper bound of the second-highest bucket. Updated the wording to describe the actual behavior.

## Review Notes
- The OpenTelemetry HTTP server duration metric name and unit are current: `http.server.request.duration` is a histogram with unit `s`.
- The Python and Go SDK view examples use current explicit bucket histogram aggregation APIs.
- The PromQL examples correctly include `le` in the aggregation for classic histogram quantiles.
