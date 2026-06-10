# Validation Summary: How to Implement Stress Testing Strategies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- k6 (load testing tool) — JavaScript-based scripting
- Python (3.x) — using `requests`, `statistics`, `subprocess`, `dataclasses`, `enum`, `typing`
- Prometheus / PromQL — querying metrics via `/api/v1/query`
- node_exporter metrics (CPU, memory)
- postgres_exporter metrics (`pg_stat_activity_count`, `pg_stat_statements`)

## Sources Consulted
- k6 docs — Stages and ramp-up: https://grafana.com/docs/k6/latest/using-k6/k6-options/reference/#stages
- k6 docs — Scenarios and executors (`constant-vus`): https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/constant-vus/
- k6 docs — Metrics (`Rate`, `Trend`, `Counter`): https://grafana.com/docs/k6/latest/javascript-api/k6-metrics/
- k6 docs — `http.batch()` signatures: https://grafana.com/docs/k6/latest/javascript-api/k6-http/batch/
- k6 docs — Thresholds (`http_req_duration`, `http_req_failed`): https://grafana.com/docs/k6/latest/using-k6/thresholds/
- Prometheus HTTP API: https://prometheus.io/docs/prometheus/latest/querying/api/
- node_exporter metric names: https://github.com/prometheus/node_exporter
- postgres_exporter metric names: https://github.com/prometheus-community/postgres_exporter
- Python `requests` library — `Response.elapsed`: https://requests.readthedocs.io/en/latest/api/#requests.Response.elapsed

## Issues Found
- The narrative on the gradual ramp-up k6 script claimed "Each stage increases load by 50 users over 2 minutes." This did not match the actual `stages` array, which jumps by 50, 50, 100, 200, 400, 200, 500 between targets. Updated the sentence to accurately describe the 2-minute ramp duration and the actual target VU progression (50 → 100 → 200 → 400 → 800 → 1000 → 1500).

## Review Notes
- The k6 recovery test relies on module-level mutable variables (`baselineP95`, `recoveryStart`, `recoveryComplete`). In k6 these are per-VU rather than shared across VUs, so the displayed recovery-time logic is illustrative only. The author has already flagged this with the "simplified - actual implementation would aggregate" comment, so no change was made.
- The percentile index calculation `int(len(sorted_times) * 0.95)` in `baseline_collector.py` is a common approximation; with very small samples it can pick the maximum value as p95/p99, but the approach is standard and acceptable for baseline collection.
- The PromQL `pg_stat_statements_mean_time_seconds` example is illustrative — actual postgres_exporter exposes cumulative `pg_stat_statements_seconds_total` counters and requires a `rate()` to derive mean time. Treating it as a single gauge is a simplification but the broader pattern (querying Prometheus, parsing the response shape) is correct.
- The `http.batch([['GET', url], ...])` array-of-arrays form remains supported by k6 alongside the newer array-of-objects form; no deprecation concern.
