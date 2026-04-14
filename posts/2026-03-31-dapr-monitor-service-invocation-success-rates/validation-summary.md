# Validation Summary: How to Monitor Dapr Service Invocation Success Rates

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (service invocation, sidecar metrics)
- Prometheus (PromQL queries, PrometheusRule CRD)
- Grafana (dashboard thresholds)
- Dapr CLI (`dapr invoke`)
- Kubernetes (prometheus-operator CRDs)

## Sources Consulted
- Dapr metrics documentation: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr source code `pkg/diagnostics/http_monitoring.go` for HTTP metric definitions
- Dapr CLI reference for `dapr invoke`: https://docs.dapr.io/reference/cli/dapr-invoke/
- Prometheus Operator API reference for PrometheusRule CRD: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
1. **Incorrect metric name `dapr_http_client_request_count`**: This metric does not exist in Dapr. The actual client-side HTTP metric is `dapr_http_client_completed_count`. Fixed in the metrics list.

2. **Incorrect metric name `dapr_service_invocation_req_sent_total`**: Missing the `runtime` prefix. The actual metric name is `dapr_runtime_service_invocation_req_sent_total`. Fixed in the metrics list.

3. **Incorrect label `namespace` on HTTP metrics**: The `namespace` label is associated with the `dapr_runtime_service_invocation_*` metrics, not the HTTP server/client metrics. The HTTP metrics include `app_id`, `method`, `status`, and `path`. Changed `namespace` to `path`.

## Review Notes
- The PromQL queries throughout the post correctly use `dapr_http_server_request_count` with `status!~"5.."` to filter 5xx responses, which is a valid approach for success rate calculation.
- The `DaprServiceInvocationAllFailing` alert uses `== 0` which will only fire when there are requests and all return 5xx. If there are zero requests, the division produces NaN, so this alert would not fire on a completely idle service -- which is actually reasonable behavior but worth noting.
- The `dapr invoke` CLI command syntax (`--app-id`, `--method`, `--verb`) is correct per official documentation.
- The PrometheusRule YAML structure is correct for the prometheus-operator CRD (`monitoring.coreos.com/v1`).
