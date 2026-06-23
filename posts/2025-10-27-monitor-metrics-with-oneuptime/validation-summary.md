# Validation Summary: Monitor Metrics with OneUptime: Turn Numbers into Action Without Code

## Status
validated

## Post Type
Guide / Product tutorial (how to build metric monitors in OneUptime, with illustrative PromQL and OpenTelemetry/OTLP examples)

## Technologies Covered
- OneUptime metric monitors (MetricView builder, alert rules, notifications)
- PromQL (Prometheus query language) query patterns
- OpenTelemetry metrics / OTLP JSON export format
- cAdvisor / container metrics (`container_cpu_usage_seconds_total`, `container_memory_usage_bytes`)
- General observability/alerting concepts (Apdex, P95 latency, error rate)

## Sources Consulted
- OpenTelemetry Semantic Conventions — HTTP metrics (`http.server.request.duration`, unit `s`): https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry Protocol (OTLP) — metrics data model & JSON encoding: https://opentelemetry.io/docs/specs/otel/metrics/data-model/ and https://opentelemetry.io/docs/specs/otlp/
- Protocol Buffers proto3 JSON mapping (int64 → string): https://protobuf.dev/programming-guides/proto3/#json
- Prometheus querying basics & functions (`rate`, `histogram_quantile`, `sum by`): https://prometheus.io/docs/prometheus/latest/querying/functions/
- cAdvisor / Prometheus container metric naming conventions

## Issues Found
1. **OTLP histogram unit/bounds magnitude mismatch.** The example metric `http.server.request.duration` declares `unit: "s"` (matching the OTel semantic convention), but the `explicitBounds` were `[50, 100, 250, 500, 1000]` and `sum` was `45678.9` — magnitudes that only make sense in milliseconds. As written, the data implied 50–1000 *second* HTTP request durations, which is unrealistic and inconsistent with the declared unit. Fixed by converting the bounds to seconds (`[0.05, 0.1, 0.25, 0.5, 1.0]`) and setting `sum` to `225.4`, which is consistent with the unchanged bucket distribution (~180 ms average over 1250 requests) and with the metric's standard unit.
2. **OTLP/JSON int64 encoding.** `http.status_code` was encoded as `{ "intValue": 200 }` (a bare number). Per the proto3 JSON mapping that OTLP/JSON follows, 64-bit integer fields (`AnyValue.int_value`) must be serialized as strings. Changed to `{ "intValue": "200" }`, which also makes it consistent with the already-quoted `startTimeUnixNano`/`timeUnixNano` fields in the same payload.

## Review Notes
- All PromQL examples are syntactically valid and use current, real metric names. The error-rate ratio, `histogram_quantile(0.95, sum(rate(..._bucket[5m])) by (le))` P95 calculation, and the Apdex construction (`le="2.0"` minus `le="0.5"` for the tolerating band, divided by `_count`) are all correct patterns.
- The two large JSON blocks for monitor configuration (`metricQuery`, `alertRules`, `notifications`) are illustrative OneUptime-style config rather than a strict published schema; they are internally consistent and syntactically valid JSON, so they were left as-is.
- The post is framed as "without code" yet shows PromQL and JSON examples; these are presented as optional/illustrative patterns, which is consistent and not misleading.
- The cAdvisor CPU pattern (`avg(rate(container_cpu_usage_seconds_total[5m])) * 100`) yields percent-of-a-single-core, which is a common and acceptable approximation for a guide of this scope.
