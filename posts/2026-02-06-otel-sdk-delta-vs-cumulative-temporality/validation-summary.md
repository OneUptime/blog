# Validation Summary: How to Configure the OpenTelemetry SDK to Use Delta vs Cumulative Temporality

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry metrics
- OpenTelemetry Python SDK and OTLP metric exporter
- OpenTelemetry Java SDK and OTLP metric exporter
- OpenTelemetry Go SDK and OTLP metric exporter
- OTLP metrics exporter environment variables
- Prometheus-compatible metrics backends
- Datadog, Azure Monitor, New Relic, Dynatrace, Honeycomb, Grafana Cloud, and OneUptime backend temporality preferences

## Sources Consulted
- OpenTelemetry OTLP Metrics Exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/otlp/
- OpenTelemetry Prometheus Metrics Exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry Python metrics export API documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/metrics.export.html
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Java AggregationTemporalitySelector Javadoc: https://javadoc.io/static/io.opentelemetry/opentelemetry-sdk-metrics/1.26.0/io/opentelemetry/sdk/metrics/export/AggregationTemporalitySelector.html
- OpenTelemetry Java OTLP exporter Javadoc index: https://javadoc.io/static/io.opentelemetry/opentelemetry-exporter-otlp/1.42.0/index-all.html
- OpenTelemetry Go otlpmetricgrpc package documentation: https://go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc
- OpenTelemetry Go sdk/metric package documentation: https://go.opentelemetry.io/otel/sdk/metric
- Datadog OpenTelemetry delta temporality guide: https://docs.datadoghq.com/opentelemetry/guide/otlp_delta_temporality/
- Azure Monitor OpenTelemetry metrics documentation: https://learn.microsoft.com/en-us/azure/azure-monitor/containers/collect-use-observability-data
- New Relic cumulative metrics documentation: https://docs.newrelic.com/docs/data-apis/understand-data/metric-data/cumulative-metrics
- Grafana Labs OpenTelemetry temporality discussion: https://grafana.com/blog/2023/09/26/opentelemetry-metrics-a-guide-to-delta-vs.-cumulative-temporality-trade-offs/

## Issues Found
- The Python delta example configured delta temporality for UpDownCounter, ObservableUpDownCounter, and ObservableGauge. The OpenTelemetry OTLP temporality preference for delta uses delta for Counter, asynchronous Counter, and Histogram, while UpDownCounter and asynchronous UpDownCounter remain cumulative. Updated the example to keep UpDownCounter, ObservableUpDownCounter, and ObservableGauge cumulative.
- The mixed Python example recommended delta for UpDownCounter and ObservableUpDownCounter. Updated those entries to cumulative because they are non-monotonic sums and align with OpenTelemetry's delta-preferred selector behavior.
- The Java comment said `deltaPreferred()` configures delta temporality for all instruments. Updated the comment to "Delta-preferred temporality" because Java's `AggregationTemporalitySelector.deltaPreferred()` returns delta only for Counter, ObservableCounter, and Histogram, and cumulative for UpDownCounter and ObservableUpDownCounter.
- The `lowmemory` description said it uses delta for all synchronous instruments and cumulative for asynchronous instruments. Updated it to match the OpenTelemetry specification: delta for synchronous Counter and Histogram, cumulative for synchronous UpDownCounter, asynchronous Counter, and asynchronous UpDownCounter.
- The cumulative guidance said rate calculations can be done by "just divide by time." Updated it to recommend Prometheus-style `rate()` or `increase()` functions.
- The delta guidance implied delta always lowers SDK memory usage. Updated it to the narrower, specification-aligned claim that delta lowers memory usage for synchronous counters and histograms.

## Review Notes
The backend preference table is a simplified reference. Some vendors can ingest both cumulative and delta temporality or convert at ingestion, so backend documentation should remain the source of truth when configuring production telemetry pipelines.
