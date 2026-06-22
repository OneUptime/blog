# Validation Summary: How to Fix Error Budget Management Issues

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Site Reliability Engineering
- Service Level Objectives
- Error budgets
- Prometheus
- PromQL
- Prometheus alerting rules
- Python
- prometheus-client
- YAML
- Mermaid

## Sources Consulted
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Python client Gauge documentation: https://prometheus.github.io/client_python/instrumenting/gauge/
- Google SRE Workbook, "Alerting on SLOs": https://sre.google/workbook/alerting-on-slos/

## Issues Found
- The first PromQL example was described as calculating remaining error budget but only calculated the success rate. Updated it to calculate remaining budget percentage using the actual failure rate divided by the allowed failure rate, clamped at zero.
- The PromQL examples used different definitions of a successful HTTP request. Updated the availability and burn-rate examples to consistently treat non-5xx responses as successful, matching the later SLI definition in the post.
- The 6-hour burn-rate alert claimed to detect 5% of a monthly budget consumed in 6 hours, but used a 2x burn-rate threshold. Updated the threshold to 6x, matching the Google SRE Workbook recommendation for 5% budget consumption over 6 hours.
- The standard availability SLI example used an unwindowed `requests` ratio. Updated it to use `rate()` over a 5-minute window with a counter-style `requests_total` metric.
- The standard latency SLI example used `histogram_quantile()` directly on classic histogram buckets. Updated it to use `rate()` and `sum by (le)`, which Prometheus requires when aggregating classic histogram buckets.
- Removed unused `time` and `datetime` imports from the Python examples.

## Review Notes
Python snippets were syntax-checked with `python3` AST parsing, and YAML snippets were parsed with PyYAML. `promtool` was not installed in the local environment, so PromQL correctness was reviewed against the official Prometheus documentation.
