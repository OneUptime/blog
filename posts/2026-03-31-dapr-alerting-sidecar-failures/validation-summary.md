# Validation Summary: How to Create Alerting Rules for Dapr Sidecar Failures

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar runtime)
- Prometheus (metrics and alerting rules)
- Prometheus Operator (PrometheusRule, Alertmanager, AlertmanagerConfig CRDs)
- Kubernetes (kube_state_metrics)
- AlertManager (routing, Slack, PagerDuty receivers)

## Sources Consulted
- Dapr source code: `pkg/diagnostics/http_monitoring.go` for HTTP metric definitions (`dapr_http_server_request_count`, `dapr_http_server_latency`)
- Dapr source code: `pkg/diagnostics/component_monitoring.go` for component metric definitions (`dapr_component_pubsub_ingress_count`)
- Dapr source code: `pkg/injector/consts/consts.go` confirming sidecar container name is `daprd`
- Dapr metrics documentation: `docs/development/dapr-metrics.md`
- Prometheus Operator API reference for `PrometheusRule`, `Alertmanager`, and `AlertmanagerConfig` CRD schemas
- kube-state-metrics documentation for `kube_pod_container_status_restarts_total` and `kube_pod_container_status_running` metrics

## Issues Found

### 1. Incorrect HTTP metric label name (line 63)
- **What was wrong:** The `DaprHighErrorRate` alert used `status_code=~"5.."` as the label selector for filtering 5xx responses.
- **What was changed:** Changed `status_code` to `status`.
- **Why:** The Dapr HTTP server metrics use the label `status` (not `status_code`) for the HTTP response status code. The tag keys defined in Dapr's `http_monitoring.go` are `app_id`, `method`, `path`, and `status`.

### 2. Incorrect pub/sub ingress label name (line 92)
- **What was wrong:** The `DaprPubSubDeliveryFailures` alert used `success="false"` to filter failed deliveries.
- **What was changed:** Changed `success="false"` to `process_status="drop"`.
- **Why:** The `dapr_component_pubsub_ingress_count` metric uses `process_status` and `status` labels, not a `success` label. The `success` label (with values `"true"`/`"false"`) exists only on **egress** metrics (`dapr_component_pubsub_egress_count`). For ingress metrics, `process_status="drop"` indicates failed message delivery to the application.

## Review Notes
- The Prometheus Operator CRD API versions used (`monitoring.coreos.com/v1` for PrometheusRule and Alertmanager, `monitoring.coreos.com/v1alpha1` for AlertmanagerConfig) are correct and current.
- The `kube_pod_container_status_restarts_total` and `kube_pod_container_status_running` metrics with `container="daprd"` are correct -- the Dapr sidecar injector names the container `daprd`.
- The `dapr_http_server_latency_bucket` metric name is correct -- Dapr exposes `dapr_http_server_latency` as a histogram, and Prometheus automatically creates the `_bucket` suffix.
- The AlertmanagerConfig routing structure, including `matchers`, `groupBy`, `slackConfigs`, and `pagerdutyConfigs`, follows the correct schema for the Prometheus Operator CRD.
- The `DaprSidecarMissing` alert logic using `and on(pod, namespace)` to correlate running app containers with a stopped sidecar is a valid PromQL pattern, though it could potentially produce false positives for pods with multiple non-daprd containers where only some are running.
