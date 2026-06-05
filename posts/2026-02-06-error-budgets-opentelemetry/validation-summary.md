# Validation Summary: How to Calculate Error Budgets from OpenTelemetry Trace and Metric Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry traces and metrics
- OpenTelemetry Collector span metrics connector
- OpenTelemetry Python Metrics API
- Prometheus and PromQL
- SRE error budgets and SLOs
- Mermaid diagrams

## Sources Consulted
- OpenTelemetry Collector Contrib span metrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python Metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Google SRE Workbook error budget policy: https://sre.google/workbook/error-budget-policy/
- Referenced OneUptime SLI article: https://oneuptime.com/blog/post/2026-02-06-sli-opentelemetry-metrics/view

## Issues Found
- The Collector configuration used the deprecated `spanmetrics` component name. Updated it to `span_metrics` in the connector declaration and in both trace exporter and metrics receiver references because the OpenTelemetry Collector Contrib documentation says `spanmetrics` has been renamed and is deprecated.
- The span metrics description referenced `duration_milliseconds`, which is not the current connector's documented metric name. Updated the wording to describe generated call count and duration metrics without relying on the outdated duration metric name.
- The trace-derived PromQL comment described failures as `status_code="ERROR"` while the query used the Prometheus-exported label value `STATUS_CODE_ERROR`. Updated the comment to match the query.
- The Python example created an `ObservableGauge` without a callback, so it would not emit the calculated error budget value. Added an observable gauge callback using `CallbackOptions` and `Observation`, and updated the example usage to store the computed value for the callback.
- The comparison between metric-based and trace-based error budgets said metrics are "sampled at the counter level." Updated this to "aggregated at the counter level" because counters are aggregated telemetry, not sampled in the same sense as traces.

## Review Notes
The PromQL examples are mathematically correct for request-based error budgets over a rolling window. In production, teams may still want recording rules and explicit handling for zero-traffic windows to avoid empty or NaN query results.
