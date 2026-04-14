# Validation Summary: How to Set Up Dapr Metrics with Prometheus

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar metrics)
- Prometheus (scraping and querying)
- Grafana (dashboards)
- Kubernetes (annotations, PodMonitor, Helm)
- kube-prometheus-stack (Helm chart)

## Sources Consulted
- Dapr Metrics Overview: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr Annotations Reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Metrics Reference (GitHub): https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Dapr Grafana Dashboards (GitHub): https://github.com/dapr/dapr/tree/master/grafana
- kube-prometheus-stack Helm chart: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack

## Issues Found

1. **Incorrect metric name `dapr_http_client_request_count`**: This metric does not exist. The correct metric for outbound HTTP invocation counts is `dapr_http_client_completed_count`. Fixed in the metrics table and the Service Invocation Rate PromQL query.

2. **Incorrect metric name `dapr_http_client_latency`**: This metric does not exist. The correct metric for outbound HTTP invocation latency is `dapr_http_client_roundtrip_latency`. Fixed in the metrics table and the P99 latency PromQL query (`dapr_http_client_roundtrip_latency_bucket`).

3. **Incorrect actor metric prefix `dapr_actor_*`**: Actor metrics in Dapr use the `dapr_runtime_actor_*` prefix, not `dapr_actor_*`. Fixed in the metrics table.

4. **Non-existent metric `dapr_actor_active_actors`**: This metric does not exist in Dapr. Replaced with `dapr_runtime_actor_pending_actor_calls`, which is an actual Dapr actor metric. Updated the section heading to "Actor Pending Calls" to match.

5. **Incorrect Grafana dashboard GitHub URLs**: The dashboard JSON files in the Dapr repository use a `grafana-` prefix, not `dapr-`. Fixed URLs from `dapr-system-services-dashboard.json` to `grafana-system-services-dashboard.json`, `dapr-sidecar-dashboard.json` to `grafana-sidecar-dashboard.json`, and `dapr-actor-dashboard.json` to `grafana-actor-dashboard.json`.

6. **Incorrect Grafana dashboard IDs**: The post claimed Dapr dashboards could be imported via Grafana.com IDs 11001 and 11002. ID 11001 is actually a cert-manager dashboard and 11002 does not exist. Dapr does not publish official dashboards to grafana.com. Removed this incorrect section entirely.

## Review Notes
- The default metrics port (9090), Dapr annotations (`dapr.io/enable-metrics`, `dapr.io/metrics-port`), Helm install commands, PodMonitor configuration, Prometheus scrape config, and default Grafana credentials (`admin/prom-operator`) are all correct.
- The PromQL error rate query uses `status_code` as a label name; depending on the Dapr version, this label may be named `status` instead. Users should verify the actual label name from their metrics endpoint.
- The Dapr repo default branch may be `master` or `main` depending on when it was accessed; users should verify the branch name in the curl URLs if they get 404 errors.
