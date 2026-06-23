# Validation Summary: How to Create Custom Metrics in Go with Prometheus

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- net/http
- Prometheus
- prometheus/client_golang
- promhttp
- PromQL
- Prometheus scrape configuration

## Sources Consulted
- Prometheus Go client package documentation: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus
- Prometheus promhttp package documentation: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/promhttp
- Prometheus metric types documentation: https://prometheus.io/docs/concepts/metric_types/
- Prometheus histograms and summaries best practices: https://prometheus.io/docs/practices/histograms/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus Go application instrumentation guide: https://prometheus.io/docs/guides/go-application/
- Go net/http package documentation: https://pkg.go.dev/net/http

## Issues Found
- Summary quantile wording described summaries as providing precise or exact quantiles. Prometheus summaries expose quantile estimates with configured error bounds, so the wording and example comments were updated to describe client-side quantile estimates instead.
- The production-ready example recorded HTTP status labels using `http.StatusText`, producing values like `OK`, while the PromQL error-rate query expected numeric status labels such as `500`. The example now records `strconv.Itoa(wrapped.statusCode)`, and the related test expectation was updated to `status="200"`.
- The global 95th percentile histogram PromQL example passed raw classic histogram bucket rates directly to `histogram_quantile`. It now aggregates with `sum(... ) by (le)`, preserving the required `le` label while calculating an overall percentile.

## Review Notes
- Several snippets are illustrative and depend on placeholder application types or functions such as `Item`, `Task`, `Row`, `processItem`, and `pathPattern`.
- Go was not installed in the local environment, so examples were reviewed against official API documentation and by static inspection rather than by compiling them locally.
