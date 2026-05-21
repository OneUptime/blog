# Validation Summary: How to Monitor Request Success Rate per Service in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Istio Telemetry API
- Prometheus
- PromQL
- Grafana
- Prometheus Operator PrometheusRule
- Kubernetes kubectl
- gRPC status codes

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Customizing Metrics task: https://istio.io/latest/docs/tasks/observability/metrics/customize-metrics/
- Istio Classifying Metrics Based on Request or Response: https://istio.io/latest/docs/tasks/observability/metrics/classify-metrics/
- Istio Prometheus integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus query operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- gRPC status codes guide: https://grpc.io/docs/guides/status-codes/

## Issues Found
- The "Success Rate Excluding Client Errors" query counted 4xx responses as successes instead of excluding them from the calculation. Updated the query to count 2xx and 3xx responses as successes and remove 4xx responses from the denominator.
- The Grafana success-rate panel, alerting rules, SLO error-budget query, and minimum-traffic alert expression used the same inconsistent client-error handling. Updated those examples to match the article's stated lenient success-rate definition.
- The "Success Rate by Endpoint" query grouped only by `destination_service_name`, so it did not actually break results down by endpoint. Updated the query to group by `request_path` after the custom label is added.
- The SLO error-budget example described the output as a percentage, but the expression returns a 0-to-1 ratio. Updated the comment to call it a ratio, matching the following example value of `0.5`.
- The direct sidecar metrics check used port `15090` as the raw metrics endpoint. Istio's metrics customization documentation shows checking generated proxy metrics through Envoy admin on `localhost:15000/stats/prometheus`, while merged metrics are exposed at `:15020/stats/prometheus`. Updated the command and label accordingly.

## Review Notes
The Istio metric name `istio_requests_total`, documented labels such as `reporter`, `response_code`, `source_workload`, `destination_service_name`, `destination_workload`, `request_protocol`, and `grpc_response_status`, Telemetry API `REQUEST_COUNT` and `tagOverrides` usage, PrometheusRule structure, PromQL aggregation patterns, and `kubectl exec ... -c istio-proxy -- COMMAND` syntax are consistent with current official documentation. The post assumes sidecar-based Istio telemetry; ambient-mode deployments may have different datapath details, but that does not invalidate the sidecar-focused examples.
