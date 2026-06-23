# Validation Summary: How to Measure Service Latency with Prometheus

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus
- PromQL
- Prometheus histograms and summaries
- Prometheus alerting rules
- Prometheus recording rules
- Python prometheus_client
- Go prometheus/client_golang
- Node.js prom-client
- Express middleware

## Sources Consulted
- Prometheus histograms and summaries: https://prometheus.io/docs/practices/histograms/
- Prometheus PromQL functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus recording rules: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Python prometheus_client histogram documentation: https://prometheus.github.io/client_python/instrumenting/histogram/
- Go prometheus/client_golang package documentation: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus
- Node.js prom-client documentation: https://github.com/siimon/prom-client

## Issues Found
- The Go middleware snippet referenced an undefined `statusRecorder` type and imported `promhttp` without using it. Added a minimal `statusRecorder`, removed the unused import, and recorded numeric status code labels with `strconv.Itoa`.
- The Python dynamic bucket example used `prometheus_client.exponential_buckets`, which is not provided by the Python client. Replaced it with a small local `exponential_buckets` helper.
- The error budget remaining PromQL expression had incorrect grouping and divided the success ratio by the error budget. Rewrote it as `1 - bad_ratio / error_budget`.
- The best-practices Python decorator used `.time()` directly on a labeled histogram. Updated it to call `.labels(...).time()` so observations include the required label values.

## Review Notes
- The PromQL examples use classic histogram queries. These are correct for metrics exposing `_bucket`, `_sum`, and `_count` series. Prometheus also supports native histograms, which use different query forms.
- SLO bucket-ratio queries require the exact `le` bucket boundary to exist in the instrumented histogram.
