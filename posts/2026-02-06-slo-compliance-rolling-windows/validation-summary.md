# Validation Summary: How to Track SLO Compliance Over Rolling Windows Using OpenTelemetry Histograms

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Metrics SDK
- OpenTelemetry Python SDK
- OpenTelemetry HTTP semantic conventions
- Prometheus histograms and PromQL
- Prometheus recording rules and alerting rules
- Prometheus native histograms

## Sources Consulted
- OpenTelemetry Python SDK metrics view documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.view.html
- OpenTelemetry Metrics SDK specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry Prometheus/OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- Prometheus histogram and summary practices: https://prometheus.io/docs/practices/histograms/
- Prometheus native histograms specification: https://prometheus.io/docs/specs/native_histograms/
- Prometheus PromQL function documentation for increase(): https://prometheus.io/docs/prometheus/3.4/querying/functions/#increase

## Issues Found
- The post used millisecond bucket boundary values for `http.server.request.duration`. Current OpenTelemetry HTTP semantic conventions define this histogram with unit `s`, so the bucket boundaries should be expressed in seconds. Updated the Python `ExplicitBucketHistogramAggregation` boundary list from millisecond numbers like `200` to second values like `0.2`.
- The PromQL examples queried `http_server_request_duration_bucket` and `http_server_request_duration_count` with `le` values like `200`. Under the default OpenTelemetry-to-Prometheus translation strategy, the `s` unit is appended as `_seconds`, and histogram boundaries are exported in seconds. Updated the examples to use `http_server_request_duration_seconds_bucket`, `http_server_request_duration_seconds_count`, and `le` values like `0.2`.
- The precision limitation example described a nearest bucket of `250ms` for this OpenTelemetry metric. Updated it to `0.25s` to match the metric's unit.
- The introduction said histograms capture the full request duration distribution. Histograms capture bucketed distributions, not individual observations or a fully precise distribution. Updated the wording to say they capture the bucketed request duration distribution and provide precise compliance at configured boundaries.

## Review Notes
- The Python `View`, `ExplicitBucketHistogramAggregation`, `ExponentialBucketHistogramAggregation`, `PeriodicExportingMetricReader`, and OTLP gRPC metric exporter APIs used in the examples are current in the OpenTelemetry Python documentation.
- The PromQL `increase()` examples are valid for classic Prometheus histogram bucket and count time series. Prometheus documentation notes that `rate()` is generally preferred in recording rules for per-second consistency, but the post's use of `increase()` is technically valid for rolling-window compliance ratios because numerator and denominator use the same window.
- The exponential histogram section is directionally correct, but exact threshold compliance with native/exponential histograms is still estimated unless the backend supports threshold-based operations or interpolation behavior suitable for the SLO. Explicit bucket histograms remain the most direct way to count requests under an exact SLO threshold.
