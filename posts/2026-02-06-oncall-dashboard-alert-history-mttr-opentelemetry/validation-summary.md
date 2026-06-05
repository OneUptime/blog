# Validation Summary: How to Build an On-Call Dashboard with Alert History

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry Python tracing API
- OpenTelemetry Python metrics API
- OpenTelemetry Collector
- Jaeger OTLP trace ingestion
- Prometheus Remote Write
- PromQL histogram queries

## Sources Consulted
- OpenTelemetry Python tracing API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python SDK metrics documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.html
- OpenTelemetry Metrics SDK specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Prometheus compatibility documentation: https://opentelemetry.io/docs/compatibility/prometheus/client-libraries/
- OpenTelemetry Prometheus/OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- Prometheus HTTP API remote write receiver documentation: https://prometheus.io/docs/prometheus/2.55/querying/api/#remote-write-receiver
- Jaeger deployment documentation for OTLP ports: https://www.jaegertracing.io/docs/next-release/deployment/

## Issues Found
- The noise-ratio PromQL query selected `incident_mttr_seconds_bucket{le="60"}`, but the OpenTelemetry Metrics SDK default explicit histogram boundaries do not include `60`. Added `explicit_bucket_boundaries_advisory` to the Python histogram example with a `60` boundary so the later query targets a real bucket.
- The Collector section exported metrics to Prometheus Remote Write at `/api/v1/write` but did not mention that Prometheus must enable the remote write receiver. Added a sentence noting the required `--web.enable-remote-write-receiver` flag.
- The Collector configuration comment said shift metadata was added "based on time of day", but the shown attributes processor action is a static `upsert`. Changed the comment to describe it as static metadata.

## Review Notes
The Python tracing and metrics examples use current OpenTelemetry API shapes. The PromQL metric names are consistent with OpenTelemetry-to-Prometheus name translation for dotted metric names and unit suffixes. In a production implementation, teams should also ensure their chosen OpenTelemetry SDK/exporter aggregation temporality is compatible with Prometheus histogram queries and keep label cardinality bounded for responder, alert, and incident attributes.
