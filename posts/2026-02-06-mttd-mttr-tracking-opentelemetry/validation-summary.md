# Validation Summary: How to Track Mean Time to Detection and Mean Time to Resolution

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry Python metrics API
- Prometheus HTTP API
- PromQL
- Prometheus histogram queries
- Python datetime handling
- Incident response metrics: MTTD, MTTA, and MTTR

## Sources Consulted
- OpenTelemetry Python metrics API: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry semantic convention naming guidance: https://opentelemetry.io/docs/specs/semconv/general/naming/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus query functions and histogram_quantile documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- Prometheus histograms and summaries best practices: https://prometheus.io/docs/practices/histograms/
- Prometheus OTLP metric translation configuration: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Python datetime documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- The Prometheus range-query example passed naive `datetime.isoformat()` values, which may omit timezone information. Updated the example to normalize timestamps to UTC and format them as RFC3339 timestamps accepted by the Prometheus HTTP API.
- The Prometheus query examples assumed results were always present. Added HTTP error handling and empty-result fallbacks so the examples do not fail with `IndexError` when no time series matches.
- The resolution watcher used `datetime.utcnow()`, which returns a naive datetime and is deprecated in current Python versions. Replaced it with `datetime.now(timezone.utc)`.
- The resolution watcher omitted imports needed for the snippet to run independently. Added the missing `requests` and `datetime` imports.
- The weekly average PromQL examples used `avg by (...) (rate(_sum) / rate(_count))`, which averages per-series means instead of calculating a weighted mean across all matching series. Replaced this with `sum by (...) (rate(_sum)) / sum by (...) (rate(_count))`.
- The histogram percentile examples did not aggregate classic histogram buckets with `sum by (le)`, which is required when calculating an overall percentile across label combinations. Updated the examples to aggregate buckets by `le`.
- The PromQL section did not state that the shown metric and label names assume Prometheus-style translation of OpenTelemetry dotted names to underscores. Added that caveat.

## Review Notes
The OpenTelemetry Python histogram API usage is current: `create_histogram` and `record(..., attributes=...)` match the official metrics API. The examples still use illustrative placeholders such as `PROMETHEUS_URL` and `get_primary_metric(service)`, which is acceptable for this guide but would need concrete definitions in a production sample.
