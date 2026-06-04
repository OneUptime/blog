# Validation Summary: How to Monitor Kubernetes API Server Latency Percentiles with Custom PromQL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes API server metrics
- Prometheus and PromQL
- Prometheus histograms and `histogram_quantile()`
- Prometheus alerting and recording rules
- Prometheus Operator `PrometheusRule` custom resources
- Grafana dashboard queries

## Sources Consulted
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus histograms and summaries documentation: https://prometheus.io/docs/practices/histograms/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
1. **Overstated metric type and label coverage**: The post described all listed API server metrics as histogram latency metrics and implied response-code labels were generally present. `apiserver_request_total` is a counter, and the current Kubernetes metrics reference lists `code` on `apiserver_request_total`, not on `apiserver_request_duration_seconds` or `apiserver_response_sizes`. Updated the wording to distinguish latency histograms from request-volume counters and to scope the `code` label correctly.

2. **Invalid or misleading latency variance query**: The `stddev(...) by (resource, verb)` example grouped a vector that already had one series per `resource, verb`, so it would not identify variance usefully. Replaced it with a `topk()` query that compares p99 and p50 latency for each resource and verb.

3. **Invalid PromQL range syntax for `deriv()`**: The post used a range selector on a computed `histogram_quantile()` expression as `[5m]`. For derived expressions, PromQL requires subquery syntax such as `[5m:1m]`. Updated the query accordingly.

4. **Incorrect "correlation" terminology**: The latency/request-rate example divided latency by request rate, which is a normalization ratio, not statistical correlation. Renamed the section and comments to describe it as a request-rate comparison.

5. **Nonexistent `client` label in current Kubernetes API server metrics**: The current Kubernetes metrics reference does not list a `client` or user-agent label on `apiserver_request_duration_seconds` or `apiserver_request_total`. Reworked that section to analyze latency and request volume by the documented `group` label instead.

6. **Outdated long-running request metric**: The post used `apiserver_longrunning_gauge`. Current Kubernetes documentation lists the stable metric as `apiserver_longrunning_requests`. Updated the WATCH query to use `apiserver_longrunning_requests{verb="WATCH"}`.

7. **Invalid aggregation of histogram quantiles and nonexistent duration `code` label**: The comprehensive dashboard example grouped request-duration buckets by `code` and then summed quantiles by resource and verb. The duration histogram does not have a `code` label, and summing quantiles is not a valid way to aggregate histogram percentiles. Updated the query to compute p95 directly by `verb` and `resource`.

8. **Lifetime average response-size calculation**: The LIST response-size example divided `_sum` by `_count` directly, producing a lifetime average. Updated it to use `rate(...[5m])` on both series for a current 5-minute average response size.

## Review Notes
The remaining histogram examples correctly retain the `le` label before calling `histogram_quantile()` for classic Prometheus histograms. The PrometheusRule YAML snippets parse as valid YAML and use the expected `monitoring.coreos.com/v1` structure with rule groups, `expr`, alert fields, and recording-rule fields.
