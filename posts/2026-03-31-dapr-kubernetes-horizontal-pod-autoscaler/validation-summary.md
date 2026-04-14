# Validation Summary: How to Use Dapr with Kubernetes Horizontal Pod Autoscaler

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar injection, metrics, annotations)
- Kubernetes Horizontal Pod Autoscaler (autoscaling/v2 API)
- Prometheus (metrics collection)
- Prometheus Adapter (custom metrics for HPA)
- KEDA (mentioned for event-driven autoscaling)

## Sources Consulted
- Kubernetes HPA autoscaling/v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/horizontal-pod-autoscaler-v2/
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr metrics documentation: https://docs.dapr.io/operations/observability/metrics/
- Prometheus Adapter configuration documentation: https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/config-walkthrough.md
- Kubernetes HPA custom metrics walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/

## Issues Found
1. **Prometheus Adapter metric name mismatch**: The `seriesQuery` and `metricsQuery` in the Prometheus Adapter configuration used `dapr_http_server_request_count`, but the `name.matches` regex was `^(.*)_total`, which expects the metric name to end in `_total`. Since the regex would not match the metric name, the name transformation would silently fail and no custom metric would be registered for HPA. Fixed by changing `dapr_http_server_request_count` to `dapr_http_server_request_count_total` in both `seriesQuery` and `metricsQuery`. Prometheus appends `_total` to counter metrics, so the metric stored in Prometheus would be `dapr_http_server_request_count_total`. This makes the regex match correctly and produce the expected custom metric name `dapr_http_server_request_count_per_second` that the HPA references.

## Review Notes
- The `dapr.io/metrics-port: "9090"` annotation is technically redundant since 9090 is the default Dapr metrics port, but including it explicitly is fine for documentation purposes.
- The post correctly mentions KEDA as a better alternative for pub/sub-driven workloads, which is good guidance.
- All Dapr sidecar annotations (`dapr.io/sidecar-cpu-request`, `dapr.io/sidecar-memory-request`) are valid and use correct Kubernetes quantity notation.
- The HPA YAML uses the stable `autoscaling/v2` API (GA since Kubernetes 1.23), which is current and correct.
