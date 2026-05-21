# Validation Summary: How to Query Istio Metrics Using PromQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Prometheus
- PromQL
- Prometheus histograms
- Prometheus Operator `PrometheusRule`
- Kubernetes custom resources

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus query operators: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus recording rules: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The "Error Rate Excluding 404s" example filtered `response_code=~"5.."` and `response_code!="404"` together. Since 404 is not a 5xx status, the 404 exclusion did nothing. Changed the explanation and query to count non-2xx responses while excluding 404, and required `response_code` to be present so the negative regex matcher does not select series without that label.
- The double-counting note said each request is always reported twice. Istio's `reporter` label identifies client/gateway (`source`) and server (`destination`) reports, but not every traffic path necessarily has both. Reworded the note to say requests between sidecar-injected workloads can be reported by both proxies.
- The division gotcha said a zero denominator returns no data. PromQL arithmetic follows IEEE 754 behavior for float samples, so zero denominators can produce `+Inf` or `NaN`; missing vector matches are what get omitted. Updated the explanation and example to filter zero denominators and then default absent results with `or vector(0)`.
- The rate interval guidance stated `[5m]` as a minimum. Prometheus examples and guidance depend on scrape interval and use case, so this was softened to recommend choosing a range long enough for the scrape interval, with at least 4x scrape interval as the rule of thumb.

## Review Notes
The remaining Istio metric names, standard labels, histogram bucket queries, `histogram_quantile()` use of `le`, recording rule structure, and `PrometheusRule` API version/kind were consistent with the official documentation checked. `promtool` was not installed locally, so PromQL examples were reviewed against official syntax and semantics rather than parsed with the CLI.
