# Validation Summary: How to Add Custom Metrics to Python Applications with Prometheus

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- Prometheus
- prometheus_client (Python client library)
- Flask
- FastAPI / Starlette (BaseHTTPMiddleware)
- Gunicorn (multiprocess mode)
- Prometheus Pushgateway

## Sources Consulted
- prometheus_client Python documentation — Summary: https://prometheus.github.io/client_python/instrumenting/summary/
- prometheus_client Python documentation — Counter: https://prometheus.github.io/client_python/instrumenting/counter/
- prometheus_client Python documentation — Histogram, Gauge, Info, multiprocess, custom collectors, and Pushgateway (https://prometheus.github.io/client_python/)
- Prometheus metric and naming best practices: https://prometheus.io/docs/practices/naming/

## Issues Found
1. **Incorrect claim that Python Summary provides quantiles.** The "Summary Example" section stated "Summaries provide quantiles directly" and the metric-types table described Summary as "Similar to histogram with quantiles / Request duration percentiles." This is wrong for the Python client: unlike the Go and Java clients, `prometheus_client` Summary does **not** compute quantiles locally — it only exposes `_count` and `_sum` time series, and the official docs direct users to a Histogram for percentiles.
   - **Fix:** Updated the table row to "Running count and sum of observations / Total bytes sent, average response size," and rewrote the section intro to explain that the Python client does not compute quantiles locally and that a Histogram should be used for p50/p95/p99. Also corrected the misleading `# Create summary with quantiles` code comment to `# Create a summary - exposes _count and _sum time series`.

## Review Notes
- **Counter `_total` naming (verified, no change needed):** Naming a counter `http_requests_total` is correct. The Python client strips a trailing `_total` from the supplied name and re-appends it at exposition time, so there is no `_total_total` duplication. All `*_total` counter names in the post are valid.
- The Histogram timer-decorator usage `@request_latency.labels(endpoint='/api/users').time()` is valid — `.labels(...).time()` returns a Timer usable as both a context manager and a decorator.
- The Flask response tuple form `return generate_latest(), 200, {'Content-Type': CONTENT_TYPE_LATEST}` and the FastAPI `Response(content=..., media_type=CONTENT_TYPE_LATEST)` are both correct.
- Multiprocess, custom collector (`GaugeMetricFamily`/`CounterMetricFamily` with `add_metric`), `Info().info({...})`, and `push_to_gateway(...)` usages all match the current API.
- Minor caveat (not corrected, accurate enough for a guide): in multiprocess mode, Gauges typically need a `multiprocess_mode` argument and some metric semantics change; the post's multiprocess example is correct for the registry/collector setup it demonstrates.
- The Prometheus scrape config (`scrape_interval`, `static_configs`, `metrics_path`, `honor_labels`) is valid YAML and uses correct field names.
- Naming/labeling best-practices sections align with the official Prometheus naming guidelines (units in names, bounded label cardinality).
