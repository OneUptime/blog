# Validation Summary: How to Create Service Health Score with Istio Metrics

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio service metrics
- Prometheus
- PromQL
- Prometheus recording and alerting rules
- Prometheus Operator PrometheusRule
- Grafana dashboards

## Sources Consulted
- Istio standard metrics documentation: https://istio.io/latest/docs/reference/config/metrics/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- Grafana Prometheus query editor documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/query-editor/

## Issues Found
- The success-rate description said successful requests were "2xx/3xx vs 5xx", but the PromQL query counts all non-5xx responses as successful with `response_code!~"5.."`. Updated the description to "non-5xx vs 5xx" so the prose matches the implementation.

## Review Notes
- The Istio metric names and labels used in the examples match the official Istio standard metrics documentation.
- The latency query correctly uses `histogram_quantile()` over classic histogram buckets and preserves the required `le` label during aggregation.
- The recording rule and alert rule shapes are consistent with Prometheus and Prometheus Operator documentation.
- The throughput and trend scoring formulas are valid PromQL, but their thresholds are heuristic and should be tuned against each service's SLOs and traffic profile.
