# Validation Summary: How to Implement Custom Metrics in Dapr Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar metrics architecture)
- OpenTelemetry Python SDK (metrics API)
- Prometheus (scraping, PromQL queries)
- Kubernetes (PodMonitor, pod annotations)
- Python (asyncio, context managers)

## Sources Consulted
- OpenTelemetry Python SDK metrics documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.html
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python GitHub repository (PrometheusMetricReader source): https://github.com/open-telemetry/opentelemetry-python/tree/main/exporter/opentelemetry-exporter-prometheus
- PyPI opentelemetry-exporter-prometheus: https://pypi.org/project/opentelemetry-exporter-prometheus/
- Dapr metrics configuration documentation: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Prometheus Operator PodMonitor API reference (port vs targetPort): https://github.com/prometheus-operator/prometheus-operator/issues/3071

## Issues Found

### 1. Wrong class name: `PrometheusExporter` should be `PrometheusMetricReader`
The blog used `PrometheusExporter` from `opentelemetry.exporter.prometheus`, but the correct class name is `PrometheusMetricReader`. The class was renamed to reflect that it is a pull-based metric reader, not a push-based exporter. Fixed the import and instantiation.

### 2. Incorrect usage of `PeriodicExportingMetricReader` with Prometheus
The blog wrapped `PrometheusExporter` in a `PeriodicExportingMetricReader`. This is architecturally incorrect: `PrometheusMetricReader` is itself a `MetricReader` (pull-based) and should be passed directly to `MeterProvider(metric_readers=[...])`. `PeriodicExportingMetricReader` is designed for push-based exporters (OTLP, Console, etc.) and cannot wrap a MetricReader. Removed the `PeriodicExportingMetricReader` wrapper and the unnecessary `PeriodicExportingMetricReader` import.

### 3. Incorrect import path
Changed `from opentelemetry.exporter.prometheus import PrometheusExporter` to `from opentelemetry.exporter.prometheus import PrometheusMetricReader`. Also removed the unused `from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader` import.

### 4. PodMonitor uses mutually exclusive fields `port` and `targetPort`
In the PodMonitor YAML, the application metrics endpoint specified both `port: app-metrics` and `targetPort: 9091`. These fields are mutually exclusive in the PodMonitor spec. Since the pod spec already defines a named port `app-metrics` mapped to `containerPort: 9091`, using `port: app-metrics` alone is correct and sufficient. Removed the redundant `targetPort: 9091`.

## Review Notes
- The `opentelemetry-exporter-prometheus` package is still in beta (0.x version). This is worth noting for production use cases.
- The `opentelemetry-exporter-otlp-proto-http` package is installed but never used in the code examples. It is not harmful but could confuse readers. No change made since it may be used in a fuller application context.
- The PromQL queries, Dapr annotations, business logic instrumentation pattern, and overall architecture description are all technically correct.
- The default Dapr sidecar metrics port of 9090 is correctly stated.
