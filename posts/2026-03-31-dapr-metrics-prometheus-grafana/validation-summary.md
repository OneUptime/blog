# Validation Summary: How to Send Dapr Metrics to Prometheus and Grafana

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Dapr (sidecar metrics, Configuration CRD, control plane)
- Prometheus (scrape configs, Kubernetes service discovery, PromQL, alerting rules)
- Grafana (dashboard provisioning via ConfigMap)
- Kubernetes (annotations, namespaces, service discovery)

## Sources Consulted
- Dapr metrics configuration docs: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr Prometheus how-to: https://docs.dapr.io/operations/observability/metrics/prometheus/
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr metrics reference (source): https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Dapr control plane service docs: https://docs.dapr.io/concepts/dapr-services/operator/, https://docs.dapr.io/concepts/dapr-services/sentry/, https://docs.dapr.io/concepts/dapr-services/placement/
- Dapr production guidelines: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/

## Issues Found

1. **`spec.metric.port` in Configuration CRD is not a valid field.** The Dapr Configuration CRD does not support a `port` field under `spec.metric`. The metrics port is configured via the `dapr.io/metrics-port` Kubernetes annotation or the `--metrics-port` CLI flag. Removed the `port: 9090` line from the Configuration YAML.

2. **`dapr.io/enable-metrics` is not a valid Kubernetes pod annotation.** According to the official Dapr annotations reference, `enable-metrics` is controlled via the Configuration CRD (`spec.metric.enabled`), not as a pod annotation. Only `dapr.io/metrics-port` is a valid metrics-related annotation. Removed the `dapr.io/enable-metrics: "true"` line from the annotations block.

3. **Control plane metrics port was incorrect (8080 should be 9091).** Dapr control plane services (operator, sentry, placement) expose metrics on port 9091, not 8080. Port 8080 is not the metrics port for these services. Changed all three targets from `:8080` to `:9091`.

4. **Metric name `dapr_component_pubsub_count` does not exist.** The actual Dapr pub/sub metrics are `dapr_component_pubsub_ingress_count` and `dapr_component_pubsub_egress_count`. Changed to `dapr_component_pubsub_ingress_count` with updated description.

5. **Metric name `dapr_actor_active_actors` does not exist.** No such metric exists in Dapr. Changed to `dapr_runtime_actor_pending_actor_calls`, which tracks pending actor method invocations.

## Review Notes
- The Prometheus scrape config for sidecars only filters on `dapr.io/enabled=true` but does not account for cases where metrics are disabled at the Configuration CRD level. In production, consider also checking for the presence of a metrics port annotation.
- The Grafana dashboard JSON is a simplified example and would need additional fields (`uid`, `schemaVersion`, `datasource`, etc.) to be a fully functional Grafana dashboard definition.
- The PromQL queries and alerting rules are syntactically correct and use proper histogram_quantile patterns.
- Dapr also exposes `dapr_component_pubsub_egress_count` for outgoing pub/sub messages, which could be a useful addition to the metrics table.
