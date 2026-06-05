# Validation Summary: How to Build an Internal Observability Catalog Where Teams Register Their

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry traces, metrics, semantic conventions, and Prometheus exporter behavior
- Prometheus HTTP API and PromQL selectors
- Flask API routes and JSON responses
- PyYAML YAML parsing
- Python requests

## Sources Consulted
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry HTTP semantic convention migration notes: https://opentelemetry.io/blog/2023/http-conventions-declared-stable/
- OpenTelemetry Metrics API: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- Prometheus data model: https://prometheus.io/docs/concepts/
- Prometheus metric and label naming guidelines: https://prometheus.io/docs/practices/naming/
- Prometheus HTTP API: https://prometheus.io/docs/prometheus/latest/querying/api/
- Flask API documentation: https://flask.palletsprojects.com/
- PyYAML documentation: https://pyyaml.org/wiki/PyYAMLDocumentation

## Issues Found
- The trace contract used deprecated HTTP semantic convention attributes `http.method` and `http.status_code`. Updated them to `http.request.method` and `http.response.status_code`, matching current stable OpenTelemetry HTTP span conventions.
- The histogram metric `payment.amount.sum` was misleading because Prometheus histograms already expose `_sum` time series. Renamed the declared histogram to `payment.amount`.
- The payment amount histogram used `USD` as the unit while also including a `currency` label. Changed the unit to `"1"` and clarified the description so the contract does not imply every sample is USD.
- The processing duration metric used milliseconds. Updated the unit to seconds, added second-based example buckets, and changed the SLO threshold from `threshold_ms: 500` to `threshold_seconds: 0.5`, aligning better with OpenTelemetry and Prometheus duration conventions.
- The Flask example imported `request` but did not use it. Removed the unused import.
- The contract validation example referenced undefined `CATALOG_URL` and `PROMETHEUS_URL` constants. Added environment-backed defaults.
- The contract validation example queried Prometheus using only a dot-to-underscore metric name conversion, which would miss common counter and histogram suffixes. Added a helper that matches expected Prometheus counter and histogram names.
- The validation example assumed a hard-coded `service_name` metric label. Made the label configurable with `SERVICE_LABEL` because OpenTelemetry Prometheus exporters do not always copy resource attributes to every metric by default.
- Added `raise_for_status()` calls so failed catalog or Prometheus API requests do not get silently treated as empty contracts or missing metrics.

## Review Notes
- The catalog schema is intentionally custom, not an official OpenTelemetry schema. That is acceptable for an internal service catalog guide.
- Trace validation remains backend-specific and is left as pseudocode, which the post explicitly notes.
- Verified that the Python code blocks are syntactically valid with `python3` compilation.
