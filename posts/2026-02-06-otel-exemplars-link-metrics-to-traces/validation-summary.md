# Validation Summary: How to Configure Exemplars to Link Prometheus-Style Metrics Directly to

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry SDK metrics
- OpenTelemetry exemplars
- OpenTelemetry declarative SDK configuration
- OpenTelemetry Collector
- Prometheus Remote Write
- Prometheus exemplar storage and exemplar API
- Grafana Prometheus and Tempo data sources
- Python OpenTelemetry metrics API

## Sources Consulted
- OpenTelemetry declarative configuration docs: https://opentelemetry.io/docs/languages/sdk-configuration/declarative-configuration/
- OpenTelemetry declarative configuration schema reference: https://opentelemetry.io/docs/specs/otel/configuration/types/
- OpenTelemetry configuration schema docs: https://github.com/open-telemetry/opentelemetry-configuration/blob/main/schema-docs.md
- OpenTelemetry metrics data model, exemplars: https://opentelemetry.io/docs/reference/specification/metrics/data-model/
- OpenTelemetry Collector Prometheus Remote Write exporter docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/prometheusremotewriteexporter
- OpenTelemetry Collector OTLP exporter docs: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/otlpexporter
- OpenTelemetry proto metrics definitions: https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/metrics/v1/metrics.proto
- OpenTelemetry Prometheus/OpenMetrics compatibility spec: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- Prometheus configuration docs, exemplar storage and remote write options: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus HTTP API docs, query_exemplars endpoint: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus Remote Write 2.0 spec, exemplar trace_id label guidance: https://prometheus.io/docs/specs/prw/remote_write_spec_2_0/
- Grafana exemplar docs: https://grafana.com/docs/grafana/latest/fundamentals/exemplars/
- Grafana Prometheus data source configuration docs: https://grafana.com/docs/grafana/latest/datasources/prometheus/configure/

## Issues Found
- The OpenTelemetry declarative configuration example used `file_format: "0.3"` and older exporter/resource syntax. Updated it to `file_format: "1.0"`, current resource attribute list syntax, and `otlp_grpc` exporters.
- The declarative configuration example included `protocol: "grpc"` under an `otlp` exporter, which is not the current schema shape. Replaced this with the `otlp_grpc` exporter type.
- The Python metrics example imported `trace` but did not use it. Removed the unused import while keeping the metric recording example intact.
- The post described the exemplar payload as exact OTLP while using a simplified shape. Reworded it as a simplified OTLP-style representation to avoid implying that it is exact protobuf JSON.
- The Collector example used the deprecated `prometheusremotewrite` component name. Updated it to the current `prometheus_remote_write` exporter name and pipeline reference.
- The Prometheus section omitted the exemplar storage feature gate caveat. Added a note that Prometheus versions which still gate exemplar storage must be started with `--enable-feature=exemplar-storage`.
- The Grafana exemplar link example used a URL macro where the UI expects a label name for an internal trace link. Changed it to use `Label name: trace_id`, matching Prometheus/OpenTelemetry exemplar label guidance.
- The PromQL section implied exemplars can be queried directly with ordinary PromQL. Reworded it to say Grafana overlays exemplars for a PromQL query and added the correct Prometheus API endpoint, `/api/v1/query_exemplars`, for direct exemplar queries.

## Review Notes
The guide is technically relevant and salvageable. Declarative configuration support is still implementation-dependent even though the schema is stable, so readers should verify SDK support for their language before relying on file-based SDK configuration in production.
