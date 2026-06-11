# Validation Summary: How to Create Performance Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python `prometheus_client` library (Histogram, Counter, Gauge)
- PromQL (Prometheus Query Language) — `histogram_quantile`, `rate`, `sum by`, subqueries (`max_over_time`, `avg_over_time`)
- Prometheus recording rules (YAML)
- Prometheus alerting rules (YAML) with Alertmanager template functions (`humanizeDuration`, `humanize`)
- Python standard library: `functools.wraps`, `dataclasses`, `collections.deque`, `threading.Lock`, `contextlib.contextmanager`, `typing` generics

## Sources Consulted
- Prometheus Python client docs: https://prometheus.github.io/client_python/
- PromQL functions reference: https://prometheus.io/docs/prometheus/latest/querying/functions/
- PromQL `histogram_quantile`: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- Prometheus subquery syntax: https://prometheus.io/docs/prometheus/latest/querying/basics/#subquery
- Prometheus recording rules: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Alertmanager template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Prometheus naming conventions for `_total` counters and `_seconds` histograms: https://prometheus.io/docs/practices/naming/

## Issues Found
- Fixed one misleading inline comment in `BaselineConfig`: the field `anomaly_threshold: float = 3.0` was documented as "Number of standard deviations for anomaly detection", but the code never computes a standard deviation — it multiplies the value against the percentage deviation (e.g., `> anomaly_threshold * 100`). Updated the comment to accurately describe the field as a "Threshold multiplier for anomaly detection (used against percentage deviation)" so readers do not assume a 3-sigma statistical interpretation.

## Review Notes
- All `prometheus_client` API usage is correct: `Histogram(name, doc, labels, buckets=...)`, `Counter(...)`, `Gauge(...)`, and the `.labels(...).observe()`, `.inc()`, `.dec()`, `.set()` methods are all current and accurate.
- Metric naming follows Prometheus conventions (`_total` suffix for counters, `_seconds` suffix for time-based histograms).
- All PromQL examples are syntactically valid, including the subquery forms `max_over_time(rate(...)[1h:])` and `avg_over_time(rate(...)[7d:1h])`.
- The `histogram_quantile` queries correctly operate on `_bucket` time series wrapped in `rate(...)`, with `le` preserved via `sum by (..., le)` where aggregation is needed. The first p50 example omits the `sum by (le)` wrapping; this still works when there is a single series but is slightly less idiomatic — left as-is since it is not incorrect.
- The recording rule format (`groups:` / `name` / `interval` / `rules` with `record` and `expr`) and the alerting rule format (with `for`, `labels`, `annotations`) are correct.
- Alertmanager template functions used (`humanizeDuration`, `humanize`) are real and current.
- Python 3.9+ generic syntax (`dict[str, ThroughputWindow]`, `Optional[dict[float, float]]`) is used throughout — fine for current Python versions.
- Minor code-quality observation (not fixed because it would require restructuring rather than a typo-level edit): the `ConcurrencyTracker.track_request` context manager measures `queue_time` as the elapsed time between two `time.perf_counter()` calls separated only by a counter increment, so in practice this measures sub-microsecond overhead rather than actual queue wait time. The example's `if queue_time > 0.1` check would essentially never fire. Readers wanting real queue measurement would need to capture an arrival timestamp before the request enters processing and pass it in.
- The `prometheus_client` import in `baseline_metrics.py` includes `Counter` which is not used in that snippet. Cosmetic only.
- Inconsistent scaling between the latency anomaly check (`> anomaly_threshold * 100`) and the throughput anomaly check (`< -anomaly_threshold * 10`) means the same configured threshold triggers at very different deviation magnitudes for each metric. Not a runtime bug but a design quirk worth being aware of.
