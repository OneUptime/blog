# Validation Summary: How to Use Grafana Tempo for Traces

## Status
validated

## Post Type
Tutorial / Comprehensive Guide

## Technologies Covered
- Grafana Tempo (2.3.1)
- OpenTelemetry Collector (Contrib 0.91.0)
- Grafana (10.2.3)
- OpenTelemetry Python SDK (Flask, requests, sqlalchemy instrumentation)
- OpenTelemetry Node.js SDK (Express auto-instrumentation)
- OpenTelemetry Go SDK (otelhttp, otlptracegrpc)
- TraceQL query language
- Docker Compose
- Kubernetes / Helm (tempo-distributed chart)
- Prometheus (ServiceMonitor / PrometheusRule via prometheus-operator)
- S3 (object storage backend)
- Loki (trace-to-logs correlation)

## Sources Consulted
- Grafana Tempo configuration reference: https://grafana.com/docs/tempo/latest/configuration/
- TraceQL language docs: https://grafana.com/docs/tempo/latest/traceql/
- TraceQL metrics queries: https://grafana.com/docs/tempo/latest/traceql/metrics-queries/
- OpenTelemetry Python SDK API: https://opentelemetry-python.readthedocs.io/
- OpenTelemetry Collector tail_sampling processor: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor
- OpenTelemetry Collector probabilistic_sampler processor docs
- OpenTelemetry JavaScript SDK: https://opentelemetry.io/docs/languages/js/
- OpenTelemetry Go SDK: https://opentelemetry.io/docs/languages/go/
- Grafana datasource provisioning docs (tracesToLogsV2, tracesToMetrics)

## Issues Found
- **`sort(desc)` is not a valid TraceQL function** (in the "Identifying Performance Bottlenecks" section). TraceQL does not support a `sort` aggregator/pipe; ordering is handled by the UI. Removed the ` | sort(desc)` pipe from the query.
- **`stddev(duration)` is not a valid TraceQL aggregator** (in the same section). TraceQL supports `count`, `sum`, `avg`, `min`, `max` (and metrics-query functions like `quantile_over_time`, `rate`, etc.), but not `stddev`. Replaced with `max(duration)` and updated the surrounding comment so the example remains coherent.

## Review Notes
- The Tempo `metrics_generator.traces_storage.path` field used in the development config is a valid configuration key (used by the local-blocks processor) — kept as-is.
- `grpc.DialContext` (used in the Go example) is deprecated in grpc-go v1.63+ in favor of `grpc.NewClient`. It still works and is widely used in OpenTelemetry examples, so left unchanged to avoid an unrelated rewrite.
- `SemanticResourceAttributes` from `@opentelemetry/semantic-conventions` (used in the Node.js example) has been superseded by named constants (`ATTR_SERVICE_NAME`, etc.) in newer versions of the package, but still functions in the versions widely deployed today. Left as-is.
- The Grafana dashboard JSON link in the correlation section has slightly awkward escaping of nested quotes inside the `url` field; it conveys the pattern correctly but a copy-paste user would need to refine it for their dashboard. Not a clear-cut technical error, so left as-is.
- TraceQL `quantile_over_time(duration, 0.95)` is valid syntax in Tempo 2.4+ metrics queries — verified and kept.
- Tail-sampling policy types (`status_code`, `latency`, `string_attribute`, `probabilistic`) and field names (`decision_wait`, `num_traces`, `expected_new_traces_per_sec`) match the upstream `tailsamplingprocessor` configuration.
- Python SDK imports `SERVICE_NAME` and `SERVICE_VERSION` from `opentelemetry.sdk.resources` — both are valid exports.
