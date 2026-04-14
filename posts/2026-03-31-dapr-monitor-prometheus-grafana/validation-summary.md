# Validation Summary: How to Monitor Dapr on Kubernetes with Prometheus and Grafana

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (distributed application runtime)
- Prometheus (metrics collection and alerting)
- Grafana (metrics visualization)
- Kubernetes
- Prometheus Operator / ServiceMonitor / PrometheusRule CRDs

## Sources Consulted
- [Dapr Metrics Configuration Docs](https://docs.dapr.io/operations/observability/metrics/metrics-overview/) - verified Configuration spec field names, default port, annotations, and cardinality modes
- [Dapr Prometheus Integration Docs](https://docs.dapr.io/operations/observability/metrics/prometheus/) - verified Prometheus scraping setup
- [Dapr Grafana Docs](https://docs.dapr.io/operations/observability/metrics/grafana/) - verified dashboard file names and import steps
- [Dapr Metrics Reference (GitHub)](https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md) - verified all metric names, labels, and descriptions
- [Dapr Grafana Dashboard Directory (GitHub)](https://github.com/dapr/dapr/tree/master/grafana) - verified exact dashboard JSON filenames

## Issues Found

1. **Configuration field name was singular instead of plural.** The post used `spec.metric` but the Dapr Configuration spec uses `spec.metrics` (plural). Also removed the `port: 9090` sub-field since the port is configured via annotations (`dapr.io/metrics-port`) or CLI flags, not directly in the metrics spec.

2. **Grafana dashboard filenames were incorrect.** The post referenced `system-services-dashboard.json`, `sidecar-dashboard.json`, and `actor-dashboard.json`, but the actual filenames in the Dapr repo have a `grafana-` prefix: `grafana-system-services-dashboard.json`, `grafana-sidecar-dashboard.json`, and `grafana-actor-dashboard.json`.

3. **HTTP latency metric name had incorrect suffix.** The post used `dapr_http_server_latency_ms` but the actual metric name is `dapr_http_server_latency` (no `_ms` suffix).

4. **Pub/sub metric name was incorrect.** The post used `dapr_component_pubsub_count` which does not exist. The actual metrics are `dapr_component_pubsub_ingress_count` (for incoming messages) and `dapr_component_pubsub_egress_count` (for outgoing messages). Changed to `dapr_component_pubsub_ingress_count`.

5. **Actor metric name was fabricated.** The post used `dapr_runtime_actor_active_actors` which does not exist in Dapr's metrics. Replaced with `dapr_runtime_actor_pending_actor_calls`, which tracks pending actor calls waiting to acquire per-actor locks.

6. **Alert expression used invalid label match for HTTP status codes.** The post used `status="5xx"` but Dapr records actual numeric HTTP status codes (e.g., "500", "503"), not category strings. Changed to regex matcher `status=~"5.."` to correctly match all 5xx status codes.

## Review Notes
- The ServiceMonitor example uses `matchLabels: app: dapr` which may need to be adjusted depending on the actual label selectors used by the Dapr Helm chart installation. Users should verify the labels on their Dapr system services.
- The post could benefit from mentioning `dapr_component_pubsub_egress_count` alongside the ingress metric for complete pub/sub observability, but this is a content suggestion, not a technical error.
- The Prometheus annotations approach (Step 2) and the ServiceMonitor approach (Step 3) are two separate scraping strategies. The post presents both without clarifying that typically only one is needed depending on your Prometheus setup.
