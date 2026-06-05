# Validation Summary: Set Up Performance Benchmark Baselines from OpenTelemetry Trace Latency Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python SDK
- OpenTelemetry OTLP gRPC exporter
- OpenTelemetry Collector
- OpenTelemetry Span Metrics Connector
- Prometheus exporter and PromQL
- Python datetime and requests

## Sources Consulted
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector Span Metrics Connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Collector Prometheus exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.153.0/exporter/prometheusexporter
- Prometheus histogram and quantile documentation: https://prometheus.io/docs/practices/histograms/
- Python datetime documentation: https://docs.python.org/3.14/library/datetime.html

## Issues Found
- The `order_handler.py` example used `trace.get_current_span()` without importing `trace`. Added `from opentelemetry import trace` and removed the unused `time` import.
- The Collector config used the deprecated `spanmetrics` connector component name. Updated it to the current `span_metrics` component name in the connector declaration and service pipelines.
- The span metrics config enabled exemplars, but the Prometheus exporter does not expose exemplars unless OpenMetrics output is enabled. Added `enable_open_metrics: true` to the Prometheus exporter.
- The baseline script defaulted `PROMETHEUS_URL` to the Collector's Prometheus exporter scrape endpoint, but the script uses Prometheus's `/api/v1/query` API. Changed the default to `http://localhost:9090` and clarified that Prometheus must scrape the Collector metrics endpoint first.
- The PromQL query used `duration_milliseconds_bucket`, which does not match the normalized metric name generated from the Span Metrics Connector's default `traces.span.metrics.duration` histogram through the Prometheus exporter. Updated it to `traces_span_metrics_duration_milliseconds_bucket`.
- The baseline script used `datetime.utcnow()`, which is deprecated in Python 3.12 and later. Replaced it with `datetime.now(timezone.utc)`.

## Review Notes
The example remains intentionally minimal and assumes a Prometheus server is scraping the Collector's `0.0.0.0:8889/metrics` endpoint. In a production setup, readers should also configure Prometheus scrape targets and add error handling around failed HTTP requests or empty Prometheus responses.
