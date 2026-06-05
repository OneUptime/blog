# Validation Summary: How to Use Retry-Aware Error Tracking with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python tracing API
- OpenTelemetry Python metrics API
- Prometheus / PromQL
- Prometheus alerting rules
- Python retry logic and exception classification

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry Prometheus client compatibility documentation: https://opentelemetry.io/docs/compatibility/prometheus/client-libraries/
- Prometheus querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus histograms and summaries documentation: https://prometheus.io/docs/practices/histograms/

## Issues Found
- The `retry_instrumented.py` snippet used `TransientError` and `PermanentError` without importing them. Added `from error_classification import PermanentError, TransientError` so the example resolves the custom exception classes defined in the next snippet.
- The per-attempt metrics function did not record the final permanent-failure attempt in `operation.attempt.outcome.total`, which made the system-health query undercount permanent failed attempts. Added a `permanent_failure` attempt metric when `final_outcome == "permanent_failure"`.
- The retry-rate PromQL query was labeled as a percentage but returned a requests-per-second difference. Wrapped the difference in a division by successful operation rate and clarified that this derived query measures the percentage of successful operations that needed a retry.
- The post described the user-facing error rate as "permanent failures only", but the metric query includes any final non-success outcome, including exhausted retries. Updated the wording to "final failures after retries".

## Review Notes
The OpenTelemetry tracing APIs used in the examples are current: nested `start_as_current_span` calls create child spans, `record_exception` is the documented way to add exception events, and `set_status` is supported for marking spans with error status. The Prometheus metric names in the queries assume the common OpenTelemetry-to-Prometheus translation where dots become underscores and counters receive a `_total` suffix.
