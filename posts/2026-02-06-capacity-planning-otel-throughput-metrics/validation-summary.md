# Validation Summary: How to Build a Capacity Planning Model from OpenTelemetry Throughput

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python metrics API and SDK
- OTLP gRPC metric export
- psutil system metrics
- Prometheus HTTP API
- PromQL
- Prometheus alerting rules
- Python, NumPy, and requests

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Prometheus and OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus OpenTelemetry guide: https://prometheus.io/docs/guides/opentelemetry/
- psutil documentation: https://psutil.readthedocs.io/stable/

## Issues Found
- The OpenTelemetry callback example used `metrics.Observation`; updated it to import and use `Observation` directly, matching the official OpenTelemetry Python instrumentation docs.
- The instrumentation emitted dotted metric and attribute names while the PromQL examples queried underscore-style Prometheus names and labels. Updated the example metric and attribute names to use underscore names directly so the emitted metrics match the queries without depending on exporter-specific translation behavior.
- The request counter was named `app.requests.total`, which could lead to an awkward or mismatched Prometheus counter name. Renamed it to `app_requests` so the Prometheus counter query `app_requests_total` matches Prometheus counter suffix conventions.
- The memory callback mixed utilization ratio and available bytes in one `system.memory.utilization` gauge. Split available memory into `system_memory_available_bytes` so a single metric does not contain incompatible units.
- The capacity model claimed to align timestamps but only sliced arrays by length. Added timestamp-based alignment before regression.
- The Prometheus query helper did not raise on HTTP errors. Added `raise_for_status()` so failures are not silently treated as empty data.
- The model and forecast examples could fail with unclear NumPy errors when too few samples were returned. Added explicit sample-count checks.
- The forecast example returned only `days_remaining` and `message` when traffic was not growing, but the `__main__` block printed other keys. Updated the return shape to remain consistent.
- The capacity exhaustion calculation could return a negative day count when current peak traffic already exceeded safe capacity. Added a zero-day result for that case.
- The alert expressions could fire when CPU utilization was decreasing because a negative derivative makes the time-to-threshold ratio negative. Added a positive-derivative condition to both alerts.
- The conclusion used absolute wording that the model predicts exactly when capacity will run out and prevents all surprises. Softened this to estimation language, which is more technically accurate for regression-based forecasting.

## Review Notes
- Python snippets were checked with `ast.parse` and passed.
- The YAML alert rule block was parsed with PyYAML and passed.
- `promtool` was not installed in the local environment, so the Prometheus rule file was not checked with Prometheus' own rule validator.
