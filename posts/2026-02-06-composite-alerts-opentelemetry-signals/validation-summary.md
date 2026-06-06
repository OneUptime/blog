# Validation Summary: How to Build Composite Alerts That Combine Multiple OpenTelemetry Signals

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector OTLP receiver and exporters
- OpenTelemetry Collector span_metrics connector
- OpenTelemetry Collector count connector
- Prometheus and PromQL alerting rules
- Grafana Loki recording rules and ruler remote write
- Grafana Tempo via OTLP export

## Sources Consulted
- OpenTelemetry Collector spanmetrics connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Collector Prometheus exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusexporter/README.md
- OpenTelemetry Collector resource detection processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/README.md
- OpenTelemetry Collector count connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/countconnector/README.md
- Grafana Loki OTLP ingestion documentation: https://grafana.com/docs/loki/latest/send-data/otel/
- Grafana Loki HTTP API documentation for `/otlp/v1/logs`: https://grafana.com/docs/loki/latest/api/
- Grafana Loki recording rules documentation: https://grafana.com/docs/loki/latest/operations/recording-rules/
- Prometheus PromQL operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- The post said all three signals should be received on the same Collector pipeline. OpenTelemetry Collector pipelines are signal-specific, so this was changed to say the same Collector deployment receives all three signals through separate pipelines.
- The Collector config used the deprecated `resourcedetection` component name. Updated it to the current `resource_detection` name.
- The Collector config used the stale Loki exporter configuration. Current Loki OTLP ingestion uses the Collector `otlphttp` exporter pointed at Loki's OTLP endpoint, so the snippet now uses `otlphttp/loki` with `endpoint: "http://loki:3100/otlp"`.
- The trace-derived metrics snippet used the deprecated `spanmetrics` component name. Updated it to `span_metrics`.
- The span_metrics snippet included `service.name` as a configured dimension even though it is already a default dimension, which fails Collector validation as a duplicate. Removed the duplicate dimension.
- The post described the generated span duration metric as `latency`. Current span_metrics connector documentation uses `duration`, so the metric example was corrected to `traces_spanmetrics_duration_seconds_bucket`.
- The PromQL rules used `traces_spanmetrics_calls_total{status_code="STATUS_CODE_ERROR"}`. Current span_metrics status values are `Ok` and `Error`, so this was corrected to `status_code="Error"`.
- The PromQL rules used `otel_http_server_request_duration_seconds_bucket`, which is not the standard Prometheus translation of the OpenTelemetry HTTP server duration metric. Updated it to `http_server_request_duration_seconds_bucket`.
- The partial-match PromQL rule added comparison results without `bool`, which would filter vectors and preserve original sample values instead of producing 0/1 scores. Added `bool` to the three comparisons in the scoring expression.
- The post implied Loki recording rules could be pushed through the Collector metrics pipeline directly. Updated the wording to distinguish Loki ruler remote write from generating equivalent counts in the Collector with the count connector.

## Review Notes
- The Loki log recording rule assumes `level` is available as a Loki label. That can be valid in a deployment that promotes or emits this label, but OTLP logs sent to Loki may require explicit label/metadata mapping depending on the Loki configuration.
- Verified the main Prometheus alert rule and partial alert rule with `promtool` 3.11.3.
- Verified the main Collector config and the span_metrics connector configuration with `otelcol-contrib` 0.153.0.
