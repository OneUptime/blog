# Validation Summary: How to Build a Unified Query That Jumps from a Metric Spike to Related Traces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry SDK declarative configuration
- OpenTelemetry metrics, traces, logs, exemplars, and context propagation
- Grafana Tempo and TraceQL
- Grafana Loki and LogQL
- Grafana Mimir / Prometheus data source provisioning
- Python requests

## Sources Consulted
- OpenTelemetry Declarative Configuration: https://opentelemetry.io/docs/languages/sdk-configuration/declarative-configuration/
- OpenTelemetry Configuration Schema Documentation: https://github.com/open-telemetry/opentelemetry-configuration/blob/main/schema-docs.md
- OpenTelemetry HTTP Metrics Semantic Conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry Prometheus and OpenMetrics Compatibility: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- Grafana Tempo TraceQL documentation: https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/
- Grafana Tempo HTTP API documentation: https://grafana.com/docs/tempo/latest/api_docs/
- Grafana Tempo data source provisioning: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/provision/
- Grafana trace to logs correlation: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/configure-trace-to-logs/
- Grafana Prometheus data source configuration: https://grafana.com/docs/grafana/latest/datasources/prometheus/configure/
- Grafana Loki data source and derived fields: https://grafana.com/docs/grafana/latest/features/datasources/loki/
- Grafana Loki LogQL documentation: https://grafana.com/docs/loki/latest/logql/

## Issues Found
- The OpenTelemetry declarative configuration used `file_format: "0.3"` and map-style `resource.attributes`. Updated it to current `file_format: "1.0"` and the schema-defined resource attribute list format.
- The OTLP exporters were configured as `otlp` with `protocol: "grpc"`. Updated them to the current declarative configuration plugin key `otlp_grpc`.
- The propagator configuration used shorthand list values. Updated it to schema-valid `TextMapPropagator` objects under `composite`.
- The TraceQL example and Python script used `duration > 2s` for trace duration. Updated both to the current TraceQL intrinsic `trace:duration > 2s`.
- The Grafana data source provisioning referenced `tempo`, `loki`, and `mimir` as data source UIDs without defining those UIDs. Added matching `uid` fields.
- The Grafana Tempo trace-to-logs provisioning used the older `tracesToLogs` shape. Updated it to the current `tracesToLogsV2` block with tag mappings and time shifts.
- The Prometheus exemplar link used `traceID` as the exemplar label name. Updated it to `trace_id` to match the OpenTelemetry-style exemplar label shown elsewhere in the post.
- The Python example used a 2024 Unix timestamp range even though the post scenario is dated 2026-02-06. Updated the example timestamps to a 2026-02-06 14:20-14:30 UTC window.

## Review Notes
The PromQL example is plausible for Prometheus-compatible storage when OpenTelemetry metric and attribute names are translated to Prometheus naming and the service resource attribute is available as a metric label. In some pipelines, resource attributes remain on `target_info` unless the backend or exporter promotes them to metric labels, so teams should confirm their own label mapping.
