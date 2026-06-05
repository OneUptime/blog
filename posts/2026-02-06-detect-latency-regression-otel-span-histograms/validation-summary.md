# Validation Summary: How to Detect Latency Regression Between Deployments by Comparing OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript SDK
- OpenTelemetry semantic conventions
- OpenTelemetry Collector Span Metrics Connector
- OpenTelemetry Collector Prometheus exporter
- Prometheus histograms and PromQL
- Python requests
- SciPy Kolmogorov-Smirnov test

## Sources Consulted
- OpenTelemetry JavaScript Resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript semantic-conventions package documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_semantic-conventions.html
- OpenTelemetry resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- OpenTelemetry deployment semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry Collector Span Metrics Connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Prometheus and OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- Prometheus histogram documentation: https://prometheus.io/docs/practices/histograms/
- SciPy ks_2samp documentation: https://scipy.github.io/devdocs/reference/generated/scipy.stats.ks_2samp.html

## Issues Found
- The JavaScript setup used the deprecated `SEMRESATTRS_*` semantic convention exports and `new Resource(...)`. Updated the example to use `resourceFromAttributes(...)` with `ATTR_SERVICE_NAME` and `ATTR_SERVICE_VERSION`, matching current OpenTelemetry JavaScript documentation.
- The Collector example used the deprecated `spanmetrics` connector component name. Updated it to `span_metrics`, the current snake_case component name documented by the Collector contrib project.
- The Collector example referenced an `otlp` receiver in the service pipeline without defining it. Added a minimal OTLP receiver with gRPC and HTTP protocols so the configuration is complete.
- The PromQL examples queried `duration_milliseconds_bucket`, but the current Span Metrics Connector default namespace plus Prometheus name conversion produces `traces_span_metrics_duration_milliseconds_bucket`. Updated all PromQL and Python queries to use the generated metric name.
- The Python API script did not check HTTP errors from Prometheus. Added `resp.raise_for_status()` so failed queries do not silently produce empty results.
- The KS-test helper treated cumulative histogram bucket counts as per-bucket counts. Updated `histogram_to_samples` to subtract the previous cumulative bucket count before expanding approximate samples.

## Review Notes
- The post correctly recommends histogram/percentile comparison instead of averages for tail-latency regression detection.
- The KS-test example is still an approximation because it reconstructs samples from bucket midpoints; this is acceptable for an illustrative snippet but should be treated as approximate in production.
- The Span Metrics Connector documentation notes an upcoming/default-unit transition from milliseconds to seconds. The post now matches the documented current default behavior and metric name for millisecond output.
