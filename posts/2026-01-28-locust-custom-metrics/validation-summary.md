# Validation Summary: How to Use Locust with Custom Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Locust
- Python
- Prometheus client_python
- Prometheus scrape configuration
- CSV export
- Mermaid diagrams

## Sources Consulted
- Locust Event hooks documentation: https://docs.locust.io/en/stable/extending-locust.html
- Locust API documentation for events, HttpUser, HttpSession, and CsvRequestLogger: https://docs.locust.io/en/stable/api.html
- Prometheus client_python Histogram documentation: https://prometheus.github.io/client_python/instrumenting/histogram/
- Prometheus metric types documentation: https://prometheus.io/docs/concepts/metric_types/

## Issues Found
- The business logic timing snippet used `defaultdict` and `threading.Lock()` without importing `defaultdict` or `threading`. Added the missing imports so the example can run.
- The external service tracking snippet used `defaultdict` and `threading.Lock()` without importing `defaultdict` or `threading`. Added the missing imports so the example can run.
- The CSV export snippet used `threading.Lock()` without importing `threading`. Added the missing import so the example can run.
- The percentile tracking introduction said it tracked response time percentiles beyond what Locust provides by default. Locust already provides built-in response time percentile statistics, so the wording was changed to say the snippet tracks custom percentiles alongside Locust's defaults.

## Review Notes
- The Locust event listener signatures shown for `request`, `init`, `test_stop`, and `spawning_complete` match the current official Locust documentation.
- The Prometheus `Counter`, `Histogram`, `Gauge`, labels, buckets, `.observe()`, `.inc()`, `.set()`, and `start_http_server()` usage matches current client_python documentation.
- The Python snippets were syntax-checked with `python3` after edits. They are illustrative examples and still depend on the target application returning the expected JSON fields and response headers.
