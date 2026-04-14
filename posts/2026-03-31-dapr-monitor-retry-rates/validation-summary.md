# Validation Summary: How to Monitor Retry Rates in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar, resiliency policies, metrics)
- Prometheus (scrape config, PromQL, Kubernetes SD)
- Grafana (alerting rules)
- Kubernetes (annotations, pod configuration)

## Sources Consulted
- Dapr metrics reference: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr resiliency metrics (GitHub source): https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Dapr Configuration schema: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr arguments and annotations: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Prometheus setup guide: https://docs.dapr.io/operations/observability/metrics/prometheus/
- Dapr resiliency metrics issue: https://github.com/dapr/dapr/issues/4524

## Issues Found

1. **Wrong metric name `dapr_resiliency_count_total`**: The correct metric name is `dapr_resiliency_count` (no `_total` suffix). Updated the metrics table and corrected the description to "Total resiliency policy executions."

2. **Wrong metric name `dapr_service_invocation_req_sent_total`**: Missing the `runtime` segment. The correct metric name is `dapr_runtime_service_invocation_req_sent_total`. Updated in the metrics table and all PromQL examples.

3. **Incorrect label names `target` and `flow_direction`**: These labels do not exist on Dapr resiliency metrics. The correct labels are `name`, `namespace`, `policy`, and `appId`. Updated the label reference and all PromQL queries that used `target`.

4. **Wrong Configuration field `spec.metric` (singular)**: The correct field is `spec.metrics` (plural). Fixed in the Configuration YAML example.

5. **Invalid `port` field under `spec.metrics`**: There is no `port` field in the Dapr Configuration metrics spec. The metrics port is set via the `dapr.io/metrics-port` annotation or the `--metrics-port` CLI flag, both of which were already shown correctly in the annotations section. Removed the `port: 9090` line from the Configuration YAML.

6. **PromQL used non-existent `target` label**: Changed `target="order-service"` to `appId="order-service"` and `policy="retryForever"` to `policy="retry"` (the `policy` label uses values like `retry`, `timeout`, `circuitbreaker`). Also updated the Grafana alert annotation template from `$labels.target` to `$labels.appId`.

## Review Notes
- The Prometheus scrape config is missing a filter on `__meta_kubernetes_pod_annotation_dapr_io_enable_metrics` to ensure only pods with metrics explicitly enabled are scraped. The official Dapr Prometheus guide includes this additional relabel rule. This is not strictly an error (pods have metrics enabled by default), but could be improved in a future revision.
- The Grafana alert YAML uses the `apiVersion: 1` format which is a Grafana provisioning format. This is correct for file-based provisioning but readers should be aware it differs from the Grafana UI alert configuration workflow.
