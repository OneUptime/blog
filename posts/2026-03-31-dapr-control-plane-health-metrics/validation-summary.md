# Validation Summary: How to Monitor Dapr Control Plane Health with Metrics

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (control plane components: operator, sentry, placement, dashboard)
- Prometheus (scrape configuration, PromQL queries, alerting rules)
- Kubernetes (kubectl commands, namespaces, port-forwarding)

## Sources Consulted
- Dapr Helm chart values and templates in github.com/dapr/dapr (`charts/dapr/values.yaml`, deployment/statefulset templates)
- Dapr operator monitoring source code (`pkg/operator/monitoring/`)
- Dapr sentry monitoring source code (`pkg/sentry/monitoring/`)
- Dapr placement monitoring source code (`pkg/placement/monitoring/`)
- Dapr Dockerfiles (`docker/Dockerfile`) confirming distroless base images
- Dapr dashboard source code (github.com/dapr/dashboard)

## Issues Found

1. **Dashboard metrics port listed as 8080**: The dapr-dashboard does not expose Prometheus metrics. Port 8080 is the web UI port. Changed "8080" to "None" in the components table.

2. **Metrics path `/metrics` is wrong**: Dapr control plane components serve metrics at `/` (root path), not `/metrics`. This is confirmed by `prometheus.io/path: "/"` annotations in the Helm chart and `defaultMetricsPath = "/"` in source code. Changed `metrics_path: /metrics` to `metrics_path: /` in the Prometheus scrape config.

3. **`dapr_operator_reconcile_errors_total` does not exist**: This metric is fabricated. The Dapr operator exposes `dapr_operator_service_created_total`, `dapr_operator_service_deleted_total`, and `dapr_operator_service_updated_total`. Replaced with `dapr_operator_service_created_total` and `dapr_operator_service_updated_total`.

4. **`dapr_operator_components_loaded` does not exist**: This metric is fabricated. Removed and replaced with a real operator metric.

5. **`dapr_sentry_cert_sign_failed_total` has wrong name**: The actual metric is `dapr_sentry_cert_sign_failure_total` (not `failed`). Corrected in both the metrics section and the alert rules.

6. **`dapr_sentry_cert_sign_duration_seconds_bucket` does not exist**: There is no histogram metric for certificate signing duration in the sentry monitoring code. Removed the latency query entirely.

7. **`dapr_placement_actor_heartbeat_timestamp` does not exist**: This metric is fabricated. Real placement metrics include `dapr_placement_actor_runtimes_total` and `dapr_placement_leader_status`. Replaced with `dapr_placement_actor_runtimes_total`.

8. **`kubectl exec ... wget` commands won't work**: Dapr container images use `gcr.io/distroless/static:nonroot` as the base image, which contains no shell or utilities. The `kubectl exec` + `wget` approach will fail. Replaced with `kubectl port-forward` + `curl` commands.

## Review Notes
- The post's overall structure and approach to monitoring Dapr control plane components is sound. The Prometheus scrape configuration, alert rule structure, and kubectl log commands are all correct patterns.
- The `dapr_sentry_cert_sign_request_received_total` and `dapr_placement_runtimes_total` metric names were correct as originally written.
- Additional real metrics not mentioned in the post that could be useful: `dapr_placement_leader_status` and `dapr_operator_service_deleted_total`.
- The Prometheus relabel config for extracting component names from service addresses is a useful pattern and is correctly implemented.
