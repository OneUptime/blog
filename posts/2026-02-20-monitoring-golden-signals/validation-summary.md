# Validation Summary: How to Implement the Four Golden Signals of Monitoring

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google SRE Four Golden Signals
- Python
- prometheus_client
- Prometheus metrics and alerting rules
- PromQL
- psutil
- OpenTelemetry
- OneUptime

## Sources Consulted
- Google SRE book, Monitoring Distributed Systems: https://sre.google/sre-book/monitoring-distributed-systems/
- Prometheus Python client Histogram docs: https://prometheus.github.io/client_python/instrumenting/histogram/
- Prometheus Python client Instrumenting docs: https://prometheus.github.io/client_python/instrumenting/
- Prometheus Histograms and Summaries docs: https://prometheus.io/docs/practices/histograms/
- Prometheus Query Functions docs for `histogram_quantile`: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- Prometheus Alerting Rules docs: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Python `json` module docs for `JSONDecodeError`: https://docs.python.org/3/library/json.html
- psutil documentation: https://psutil.readthedocs.io/

## Issues Found
- The implicit-error example called `response.json()` while claiming to catch malformed response bodies. Invalid JSON can raise a JSON parsing error, so the snippet could crash instead of recording an implicit error. Wrapped JSON parsing in `try`/`except ValueError` and recorded `malformed_response`.
- The latency alert used `histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))`. For classic Prometheus histograms, bucket aggregation should preserve the `le` label. Updated the expression to `histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket[5m]))) > 1.0`.
- The saturation alert comment said "CPU or memory" but the rule only checked CPU. Updated the comment to describe CPU only.

## Review Notes
All Python code blocks parse successfully, and the Prometheus alert YAML parses successfully. `promtool` was not installed in the local environment, so Prometheus rule validation was performed against the official alerting and PromQL documentation rather than with the CLI.
