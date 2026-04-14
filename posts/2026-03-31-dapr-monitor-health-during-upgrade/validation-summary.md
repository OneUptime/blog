# Validation Summary: How to Monitor Application Health During Dapr Upgrades

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar architecture, service invocation, state stores, pub/sub)
- Prometheus (PromQL queries, alert rules, HTTP API)
- Kubernetes (kubectl, pod status, events, Helm rollback)
- kube-state-metrics (container restart metrics)
- Prometheus Operator (PrometheusRule CRD)
- Bash scripting (curl, jq, bc)

## Sources Consulted
- Dapr Metrics Documentation: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr GitHub metrics reference: https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- kube-state-metrics pod metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus Operator PrometheusRule CRD: https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.PrometheusRule
- PromQL label matcher syntax: https://prometheus.io/docs/prometheus/latest/querying/basics/

## Issues Found

1. **Incorrect Dapr service invocation metric name**: `dapr_service_invocation_req_sent_total` does not exist. Replaced with `dapr_http_server_request_count`, which is the correct Dapr HTTP server metric that includes a `status` label for HTTP response codes. This affected the baseline script, alert rules, live monitoring script, and health check script.

2. **Incorrect label name `response_code`**: The Dapr HTTP metrics use the label `status` (not `response_code`) for HTTP response status codes. Replaced `response_code` with `status` in all PromQL queries.

3. **Incorrect state store latency metric name**: `dapr_state_get_latency_bucket` does not exist. Replaced with `dapr_component_state_latencies_bucket`, which is the correct Dapr component-level state store latency histogram metric.

4. **Incorrect pub/sub metric name**: `dapr_pubsub_subscribe_count` does not exist. Replaced with `dapr_component_pubsub_ingress_count`, which is the correct Dapr component-level pub/sub ingress metric. Also fixed the label filter from `{success='false'}` to `{status!="success"}` to match the actual label schema.

5. **Incorrect service invocation latency metric name**: `dapr_service_invocation_req_sent_latency_bucket` does not exist. Replaced with `dapr_http_server_latency_bucket`, which is the correct Dapr HTTP server latency histogram metric.

6. **Incorrect kube-state-metrics metric name**: `kube_pod_container_restarts_total` does not exist. The correct metric from kube-state-metrics is `kube_pod_container_status_restarts_total` (note the `status` segment).

7. **Invalid PromQL single-quote syntax**: The baseline script used single quotes for PromQL label matchers (e.g., `response_code!='200'`). PromQL requires double quotes for string values. Fixed to use properly escaped double quotes.

8. **Improved error rate alert rule**: Changed the alert rule error rate expression from exact `!="200"` matching to regex `!~"2.."` matching, which correctly catches all non-2xx HTTP responses (e.g., 400, 404, 500, 503) rather than only non-200 responses.

## Review Notes
- The overall approach and architecture of the monitoring strategy is sound: baseline capture, temporary alert rules, live monitoring, and automated rollback decisions.
- The PrometheusRule CRD YAML structure is correct for the Prometheus Operator.
- The bash scripting patterns (port-forwarding, jq parsing, bc arithmetic) are correct.
- The `helm rollback dapr -n dapr-system --wait` command is a valid Helm rollback approach for Dapr installed via Helm.
- The `for: 0m` on the CrashLoop alert is intentional (fire immediately) and correct for an upgrade monitoring scenario.
