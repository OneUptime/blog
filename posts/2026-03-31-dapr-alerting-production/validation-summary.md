# Validation Summary: How to Set Up Dapr Alerting for Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (runtime metrics, pub/sub, service invocation)
- Prometheus (alerting rules, PromQL, PrometheusRule CRD)
- Prometheus AlertManager (routing, receivers, amtool)
- PagerDuty (alert integration via AlertManager)
- Slack (alert integration via AlertManager)
- Kubernetes (kube-state-metrics for control plane monitoring)

## Sources Consulted
- Dapr Metrics Overview: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr Metrics Configuration: https://docs.dapr.io/operations/observability/metrics/
- Dapr Prometheus How-To: https://docs.dapr.io/operations/observability/metrics/prometheus/
- Dapr GitHub metrics documentation: https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Prometheus AlertManager configuration docs: https://prometheus.io/docs/alerting/latest/configuration/
- PagerDuty AlertManager integration docs (v1 vs v2 Events API)
- kube-state-metrics documentation for deployment metrics

## Issues Found

1. **Incorrect service invocation metric name and label**: The post used `dapr_service_invocation_req_sent_total` with a `status_code` label. This metric does not exist in Dapr. Changed to `dapr_http_server_request_count` with the `status` label, which is the documented Dapr HTTP metric that includes HTTP status code information.

2. **Non-existent dead letter metric**: The post used `dapr_pubsub_dead_letter_total`, which is not a real Dapr metric. Dapr does not expose a dedicated dead letter counter. Changed to `dapr_component_pubsub_ingress_count{status!="success"}` to catch failed message processing, and renamed the alert from `DaprPubSubDeadLetter` to `DaprPubSubProcessingFailures` to accurately reflect what the alert monitors.

3. **Non-existent pub/sub incoming messages metric**: The post used `dapr_pubsub_incoming_messages_total` with `process_status="drop"`. This metric and label do not exist. Changed to `dapr_component_pubsub_ingress_count{status="drop"}`, which is the documented Dapr component-level pub/sub ingress metric.

4. **Deprecated PagerDuty `service_key`**: The AlertManager PagerDuty config used `service_key`, which is the deprecated v1 Events API field. Changed to `routing_key` for the current v2 Events API.

5. **Invalid AlertManager template field `.Annotations`**: The PagerDuty and Slack receiver templates used `{{ .Annotations.summary }}` and `{{ .Annotations.description }}`. In AlertManager notification templates, `.Annotations` is not a valid top-level field — the correct field is `.CommonAnnotations`. Changed both occurrences to use `.CommonAnnotations`.

6. **Wrong code fence language for latency alert**: The latency alerting rule (YAML content) was inside a ` ```bash ` code fence. Changed to ` ```yaml ` for correct syntax highlighting.

## Review Notes
- The `kube_deployment_status_replicas_available` and `kube_deployment_spec_replicas` metrics (from kube-state-metrics) are correct and a solid pattern for control plane health monitoring.
- The `dapr_grpc_io_server_server_latency_bucket` metric name is correct for gRPC latency histograms in Dapr.
- The `amtool` commands for validating AlertManager config and testing routes are syntactically correct.
- The PrometheusRule CRD (`monitoring.coreos.com/v1`) structure is correct for the Prometheus Operator.
- The AlertManager routing configuration structure (route/receivers) is syntactically valid.
- Dapr metric names have evolved across versions; the corrected metric names reflect the current documented metrics. Future Dapr releases may change metric naming conventions.
