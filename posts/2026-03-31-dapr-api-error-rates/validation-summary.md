# Validation Summary: How to Monitor Dapr API Error Rates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Prometheus (metrics collection and querying)
- Grafana (dashboards)
- PromQL (Prometheus Query Language)
- Helm (Kubernetes package manager)
- Kubernetes (kubectl for log inspection)

## Sources Consulted
- Dapr Metrics Reference (GitHub): https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Dapr Metrics Overview: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr Prometheus Integration: https://docs.dapr.io/operations/observability/metrics/prometheus/
- Dapr Helm Chart README: https://github.com/dapr/dapr/blob/master/charts/dapr/README.md
- Dapr Diagnostics Package (Go source): https://pkg.go.dev/github.com/dapr/dapr/pkg/diagnostics

## Issues Found

1. **Incorrect HTTP metric label name `status_code`**: The blog used `status_code=~"5.."` but Dapr's HTTP server metrics use the label `status`, not `status_code`. Changed all 4 occurrences of `status_code` to `status`.

2. **Non-existent pub/sub metric `dapr_component_pubsub_publish_count`**: This metric does not exist in Dapr. The correct metric for outgoing pub/sub messages is `dapr_component_pubsub_egress_count`. Changed all 4 occurrences.

3. **Non-existent binding metric `dapr_component_binding_count`**: Dapr does not have a consolidated binding metric. Bindings are split into `dapr_component_input_binding_count` and `dapr_component_output_binding_count`. Changed to `dapr_component_output_binding_count` as the blog context was about operation failures on outbound bindings.

4. **Incorrect Helm chart values**: The blog used `dapr_operator.metricsPort` and `dapr_sidecar_injector.metricsPort`, which are not valid Dapr Helm chart values. Prometheus metrics in the Dapr Helm chart are configured via `global.prometheus.enabled` and `global.prometheus.port`. Updated the Helm command accordingly.

## Review Notes
- The Prometheus alerting rules YAML structure is correct and follows standard Prometheus alerting conventions.
- The PromQL error rate calculation pattern (rate of errors / rate of total) is correct.
- The `app_id`, `method`, `component`, `type`, and `operation` labels are valid Dapr metric labels.
- The `success="false"` label filter for component metrics is correct per Dapr's diagnostics package.
- The `kubectl logs` command for correlating with sidecar logs is correct (`-c daprd` is the right container name for the Dapr sidecar).
- The state store operation values `set` and `get` are confirmed correct from Dapr source code.
