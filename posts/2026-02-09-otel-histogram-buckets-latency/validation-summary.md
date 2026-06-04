# Validation Summary: How to configure OpenTelemetry histogram buckets for latency tracking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Metrics
- OpenTelemetry Python SDK
- OpenTelemetry semantic conventions
- OTLP metrics export
- Prometheus histogram queries
- Python

## Sources Consulted
- OpenTelemetry Python SDK metrics view documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/metrics.view.html
- OpenTelemetry Python Metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Metrics SDK specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry OTLP metrics exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/otlp/
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry HTTP semantic convention migration notes: https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/
- Prometheus query function documentation for histogram_quantile: https://prometheus.io/docs/prometheus/3.9/querying/functions/#histogram_quantile

## Issues Found
- The post incorrectly stated that OpenTelemetry uses exponential histograms by default. Updated it to say histogram instruments use explicit bucket histograms by default.
- The HTTP examples used the old `http.server.duration` metric name and `ms` unit. Updated them to the stable `http.server.request.duration` metric name and `s` unit, and converted the example values and bucket boundaries to seconds.
- The default HTTP bucket example implied the semantic convention boundaries were SDK defaults. Updated the wording and code to pass the HTTP semantic convention boundaries through Python's `explicit_bucket_boundaries_advisory` parameter.
- Several snippets imported `ExplicitBucketHistogramAggregation` from `opentelemetry.sdk.metrics.aggregation`, which is not the documented public import path. Updated them to import from `opentelemetry.sdk.metrics.view`.
- The batch and database examples created views but did not register them with a `MeterProvider`, so their custom buckets would not be applied. Added the provider, reader, and exporter setup needed to attach each view.
- The service-specific example claimed endpoint-specific bucket configuration, but Python views match instrument metadata, not attribute values. Updated it to use separately named instruments and added both fast and slow views.
- The exponential bucket example used `View` without importing it. Added the missing import.
- The Prometheus `histogram_quantile` examples used the old metric name and omitted `rate(...)` around classic histogram bucket series. Updated the queries to use `rate(http_server_request_duration_seconds_bucket[5m])`.
- The post described additional buckets as increasing cardinality. Updated this wording to refer to metric data volume and bucket time series.

## Review Notes
All Python code blocks were extracted and compiled with `python3` syntax checks. The local environment does not have OpenTelemetry packages installed, so import/runtime execution was not performed locally; APIs were verified against official OpenTelemetry documentation.
