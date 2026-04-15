# Validation Summary: How to Create Custom Grafana Dashboards for Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Grafana (dashboard visualization)
- Prometheus (metrics collection and PromQL queries)
- Kubernetes (ConfigMap-based dashboard deployment, service discovery)

## Sources Consulted
- [Dapr Metrics Reference (GitHub)](https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md) — verified metric names (`dapr_http_server_request_count`, `dapr_http_server_latency`, `dapr_resiliency_activations_total`) and label names (`app_id`, `status`, `method`, `path`)
- [Configure metrics | Dapr Docs](https://docs.dapr.io/operations/observability/metrics/metrics-overview/) — confirmed default metrics port 9090, metric label names, and endpoint configuration
- [How-To: Observe metrics with Prometheus | Dapr Docs](https://docs.dapr.io/operations/observability/metrics/prometheus/) — verified Prometheus scrape configuration and metrics path (`/` not `/metrics`)
- [How-To: Observe metrics with Grafana | Dapr Docs](https://docs.dapr.io/operations/observability/metrics/grafana/) — cross-referenced Grafana dashboard setup guidance

## Issues Found

### 1. Wrong metrics path in Prometheus scrape config
- **What was wrong:** The `metrics_path` was set to `/metrics`, but Dapr sidecars serve their Prometheus metrics at the root path `/`. The official Dapr documentation uses `prometheus.io/path: "/"` in Kubernetes annotations, confirming the root path.
- **What was changed:** Changed `metrics_path: /metrics` to `metrics_path: /`.
- **Why:** Using `/metrics` would result in Prometheus getting 404 errors when trying to scrape Dapr sidecar metrics, making the entire dashboard non-functional.

### 2. Wrong label name in error rate PromQL query
- **What was wrong:** The error rate query used `status_code=~"5.."` as a label selector, but the actual Dapr HTTP metric label for HTTP response status is `status`, not `status_code`.
- **What was changed:** Changed `status_code=~"5.."` to `status=~"5.."`.
- **Why:** Using `status_code` would match no series since that label doesn't exist on `dapr_http_server_request_count`, resulting in the error rate panel always showing 0 or no data.

## Review Notes
- The PromQL queries use `bash` as the code fence language. While this doesn't affect correctness, `promql` would be more semantically accurate if the blog's rendering engine supports it.
- The Grafana dashboard JSON ConfigMap example has an empty `"panels": []` array, which is intentional as a starting template, but readers should understand they need to populate it with the panel definitions shown later in the post.
- The `grafana_dashboard: "1"` label on the ConfigMap is correct for Grafana's sidecar dashboard provisioning (used in the standard Grafana Helm chart), but the post doesn't mention that the Grafana sidecar must be enabled for this to work.
- All other metric names (`dapr_http_server_request_count`, `dapr_http_server_latency_bucket`, `dapr_resiliency_activations_total`), label names (`app_id`, `le`), Kubernetes annotations, and Grafana JSON structures are correct.
