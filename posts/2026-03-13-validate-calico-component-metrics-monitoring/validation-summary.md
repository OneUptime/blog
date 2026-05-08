# Validation Summary: How to Validate Calico Component Metrics Monitoring

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- Prometheus
- Prometheus Operator
- Bash
- curl
- jq

## Sources Consulted
- Calico documentation: Monitor Calico component metrics - https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: Monitoring Felix with Prometheus - https://docs.tigera.io/calico-cloud/reference/component-resources/node/felix/prometheus
- Calico documentation: Monitoring kube-controllers with Prometheus - https://docs.tigera.io/calico/latest/reference/kube-controllers/prometheus
- Calico Enterprise documentation: Recommended Prometheus metrics - https://docs.tigera.io/calico-enterprise/latest/operations/monitor/metrics/recommended-metrics
- Prometheus documentation: HTTP API - https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus documentation: Alerting rules - https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator API reference: PrometheusRule - https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes kubectl command help for `kubectl get nodes` and `kubectl delete`

## Issues Found
- The Prometheus query helper placed raw PromQL directly in the URL query string. This can fail for expressions with spaces such as `count(...) by (node)`. Changed the helper to use `curl -G --data-urlencode`, matching the Prometheus HTTP API requirement that query parameters be URL-encoded.
- The Typha metric `typha_connections_total` is not the current documented metric for accepted Typha connections. Changed the script and coverage matrix to use `typha_connections_accepted`.
- The Typha metric `typha_ping_latency_seconds` did not match the documented Typha ping latency metric name. Changed the coverage matrix to `typha_ping_latency`.
- The kube-controllers metric `calico_kube_controllers_reconcile_duration_seconds_count` was not in the current documented kube-controllers metric reference. Changed the script and coverage matrix to use the documented `ipam_allocations_in_use` metric.

## Review Notes
- The `PrometheusRule` example uses the current `monitoring.coreos.com/v1` API shape and valid alert rule fields.
- The alert test assumes the Prometheus instance selects `PrometheusRule` objects with the shown labels in the `monitoring` namespace. That selector is deployment-specific and may need adjustment in some kube-prometheus-stack installations.
