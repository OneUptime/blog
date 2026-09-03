# Validation Summary: How to Correlate Logs, Metrics, and Traces When Metrics Have No Trace ID

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry metrics, logs, traces, Resources, exemplars, and semantic conventions
- Prometheus and OpenMetrics exposition and PromQL
- Grafana dashboards, exemplar links, and trace/log correlation
- Grafana Tempo and its metrics-generator
- Grafana Loki and LogQL
- Kubernetes resource attributes

## Sources Consulted
- [OpenTelemetry Metrics Data Model: Exemplars](https://opentelemetry.io/docs/specs/otel/metrics/data-model/#exemplars)
- [OpenTelemetry Metrics SDK: Exemplar](https://opentelemetry.io/docs/specs/otel/metrics/sdk/#exemplar)
- [OpenTelemetry Prometheus and OpenMetrics Compatibility](https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/)
- [OpenTelemetry HTTP Metrics Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/http/http-metrics/)
- [OpenTelemetry Service Resource Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/resource/service/)
- [OpenTelemetry Logs Data Model](https://opentelemetry.io/docs/specs/otel/logs/data-model/)
- [OpenTelemetry Trace Context in non-OTLP Log Formats](https://opentelemetry.io/docs/specs/otel/compatibility/logging_trace_context/)
- [OpenMetrics 1.0 Specification](https://github.com/prometheus/OpenMetrics/blob/main/specification/OpenMetrics.md)
- [Prometheus Exposition Formats](https://prometheus.io/docs/instrumenting/exposition_formats/)
- [Grafana: Introduction to Exemplars](https://grafana.com/docs/grafana/latest/fundamentals/exemplars/)
- [Grafana: Configure Trace-to-Logs Correlation](https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/configure-trace-to-logs/)
- [Grafana: Configure Trace-to-Metrics Correlation](https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/configure-trace-to-metrics/)
- [Grafana Tempo Metrics-Generator](https://grafana.com/docs/tempo/latest/metrics-from-traces/metrics-generator/)
- [Grafana Tempo Span Metrics Processor](https://grafana.com/docs/tempo/latest/metrics-from-traces/span-metrics/span-metrics-metrics-generator/)

## Issues Found
- The histogram exemplar example used a separate prose comment rather than valid OpenMetrics exemplar exposition. It was changed to attach the exemplar label set and exemplar value to the bucket sample using the OpenMetrics 1.0 inline syntax. The metric name was also normalized to the Prometheus-compatible form of the OpenTelemetry HTTP duration metric, and complete W3C-length trace and span IDs were used.
- The cardinality guidance identified any URL dimension as unacceptable. It was narrowed to literal URLs because normalized, bounded URL-related dimensions do not inherently have unbounded cardinality; literal URLs containing variable path or query values commonly do.

## Review Notes
- The PromQL and LogQL examples are syntactically valid but intentionally depend on deployment-specific label promotion and naming. The post correctly tells readers to inspect their stored schema rather than assume that OpenTelemetry resource attributes become metric labels.
- Resource conversion in the OpenTelemetry Prometheus compatibility specification remains marked Development. Exporters may expose non-identity resource attributes through a `target`/`target_info` metric, copy them to metric labels when configured, or drop them, so the post's portability caveat is important.
- Tempo metrics generated from traces reflect the spans that reach the metrics-generator. Their suitability for SLOs therefore depends on the placement and behavior of head sampling, tail sampling, filtering, and the rest of the trace pipeline.
