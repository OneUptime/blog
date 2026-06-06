# Validation Summary: How to Build Custom Dashboards from OpenTelemetry Data

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Python Metrics API and SDK
- OpenTelemetry Collector
- OpenTelemetry Collector resource, metricstransform, batch, and OTLP HTTP exporter configuration
- Prometheus PromQL
- OneUptime OTLP ingestion
- Mermaid diagrams

## Sources Consulted
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry Collector metricstransform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/metricstransformprocessor/README.md
- OpenTelemetry Collector resource processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourceprocessor/README.md
- OpenTelemetry Collector batch processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- Prometheus histogram_quantile documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- The Python observable gauge callbacks returned raw numeric values. OpenTelemetry Python callbacks must return an iterable of `Observation` objects. Updated the callbacks to return `[Observation(...)]` and added the required import.
- The `http.server.request.duration` metric used unit `ms`, but the OpenTelemetry HTTP semantic convention defines this duration in seconds. Changed the unit to `s`.
- The Collector section said `metricstransform` pre-computes rates and error percentages. The official processor supports renames, label operations, scaling, and aggregations within a batch, not time-window rate calculations or percentage derivation. Reworded the explanation and changed the example to aggregate labels instead.
- The `aggregate_labels` operation omitted the required `aggregation_type`. Added `aggregation_type: sum`.
- The batch processor comment claimed batching reduces cardinality pressure. The batch processor reduces outgoing requests and improves transmission efficiency; it does not reduce metric cardinality. Updated the comment.
- The OneUptime exporter example used the generic OTLP exporter with an Authorization bearer header. OneUptime's documented Collector example uses `otlphttp`, JSON encoding, and `x-oneuptime-token`. Updated the exporter configuration and pipeline.
- The PromQL examples used `request_duration_ms_*` after fixing the metric to seconds. Updated the examples to `request_duration_seconds_*` and multiplied latency quantile queries by `1000` where the panel displays milliseconds.
- The status-code label used `http_status_code`, which does not match the current OpenTelemetry HTTP semantic convention attribute name after Prometheus-style normalization. Updated it to `http_response_status_code`.
- The service dashboard latency panel lacked a unit while the query now reads from a seconds histogram. Updated the title to show milliseconds and multiplied the p95 query by `1000`.

## Review Notes
The dashboard-builder code remains a backend-agnostic example. The PromQL examples assume the backend exposes OpenTelemetry resource attributes and metric attributes as Prometheus-compatible labels, with dotted names normalized to underscores.
