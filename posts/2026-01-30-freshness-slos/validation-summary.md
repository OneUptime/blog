# Validation Summary: How to Build Freshness SLOs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Service Level Objectives (SLOs) and Service Level Indicators (SLIs)
- Data pipeline freshness monitoring
- Python datetime and type annotations
- OpenTelemetry Python metrics API
- OTLP metrics export
- Prometheus alerting rules and PromQL
- Mermaid diagrams

## Sources Consulted
- OpenTelemetry Python metrics API: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Prometheus/OpenMetrics compatibility: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Prometheus operators and vector matching documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Python typing documentation: https://docs.python.org/3/library/typing.html

## Issues Found
- The freshness SLI formula used `data age < threshold`, while the examples and "no older than" wording use an inclusive threshold. Changed the formula to `data age <= threshold`.
- The Prometheus alert rules referenced `data_freshness_threshold_seconds`, but the OpenTelemetry example did not emit a threshold metric. Added `freshness_threshold_gauge` and record it during freshness checks.
- The stalled-pipeline alert referenced a last-record timestamp metric that the OpenTelemetry example did not emit. Added `last_record_timestamp_gauge` and record the Unix timestamp from `last_record_time`.
- The stalled-pipeline alert used `humanizeTimestamp` on `$value`, but `$value` is the age expression `time() - last_record_timestamp`, not the timestamp itself. Changed the annotation to use `humanizeDuration` and describe the elapsed time since the last record.
- The multi-table Python example used `Dict[str, any]`, where `any` is the built-in function rather than a typing construct. Changed it to `Dict[str, Any]` and imported `Any` from `typing`.

## Review Notes
- All Python code blocks parse successfully with `python3 ast.parse`.
- `promtool` is not installed in the local environment, so Prometheus rule verification was performed against official Prometheus documentation rather than local CLI validation.
- OpenTelemetry-to-Prometheus metric names may be translated by exporters. The alert metric names now align with the default Prometheus-compatible underscore and unit-suffix convention described by OpenTelemetry compatibility guidance.
