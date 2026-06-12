# Validation Summary: How to Monitor Chaos Experiments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Chaos engineering
- OpenTelemetry Python SDK
- OTLP exporters
- OneUptime telemetry ingestion
- Grafana Operator dashboards
- Prometheus and PromQL
- Python async monitoring code

## Sources Consulted
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry
- OneUptime cloud environment telemetry documentation: https://oneuptime.com/docs/en/telemetry/cloud-environments
- Grafana Operator quick start: https://grafana.github.io/grafana-operator/docs/quick-start/
- Grafana Operator API reference: https://grafana.github.io/grafana-operator/docs/api/
- Prometheus histogram best practices: https://prometheus.io/docs/practices/histograms/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Python datetime documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- The OpenTelemetry exporter setup did not pass OTLP headers, which are required for authenticated OneUptime telemetry ingestion. Added `OTEL_EXPORTER_OTLP_HEADERS` support to both trace and metric exporters.
- The OpenTelemetry snippet created observable gauges without callbacks and the dashboard queried `chaos_experiments_active`, but no active experiment metric was emitted. Replaced those with synchronous gauges and updated the event tracker to record active experiment and impact values.
- The event tracker used deprecated `datetime.utcnow()` calls. Replaced them with timezone-aware `datetime.now(timezone.utc).isoformat()`.
- The event tracker referenced `tracer` and `recovery_histogram` without importing them. Added imports from the telemetry module and also imported the newly used metric instruments.
- The example used a hard-coded, undocumented `/api/telemetry/events` OneUptime endpoint and `X-OneUptime-Token` header. Changed it to use a configured ingestion endpoint and the documented lowercase `x-oneuptime-token` header.
- The GrafanaDashboard custom resource was missing `spec.instanceSelector`, which the Grafana Operator uses to bind dashboard resources to Grafana instances. Added an example selector.
- Several PromQL `histogram_quantile()` expressions passed raw classic histogram bucket rates. Updated them to aggregate buckets with `sum by (le) (...)` before applying `histogram_quantile()`.
- The safety alert snippet imported `Callable` but did not use it. Removed the unused import.
- The correlation example called `_get_experiment_metrics`, `_get_recovery_metrics`, `_get_correlated_incidents`, and `_get_triggered_alerts` without defining them. Added minimal implementations so the class is internally consistent.

## Review Notes
- The examples are still framework-style snippets and assume caller-provided clients such as `metrics_client`, `chaos_controller`, and `incident_client`.
- Verified all Python snippets with `ast.parse` and verified the YAML snippet parses successfully.
