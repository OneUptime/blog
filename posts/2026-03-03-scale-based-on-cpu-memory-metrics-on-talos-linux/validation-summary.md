# Validation Summary: How to Scale Based on CPU/Memory Metrics on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes (HorizontalPodAutoscaler v2)
- Kubernetes Metrics Server
- kubectl
- kube-state-metrics / Prometheus alerting
- nginx (sample workload)
- busybox (load generator)

## Sources Consulted
- Kubernetes HorizontalPodAutoscaler documentation: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
- Kubernetes HPA Walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- Kubernetes autoscaling/v2 API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#horizontalpodautoscaler-v2-autoscaling
- Metrics Server GitHub: https://github.com/kubernetes-sigs/metrics-server
- Talos Linux documentation on deploying Metrics Server: https://www.talos.dev/latest/kubernetes-guides/configuration/deploy-metrics-server/
- kube-state-metrics HPA metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/horizontalpodautoscaler-metrics.md
- JSON Patch RFC 6902 for the kubectl patch syntax

## Issues Found
No technical issues found.

Spot-check details verified:
- Metrics Server install URL (`https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml`) is the canonical install path.
- The `--kubelet-insecure-tls` flag is a valid Metrics Server argument and a commonly required workaround on Talos clusters.
- JSON Patch op `{"op": "add", "path": ".../args/-", "value": "--kubelet-insecure-tls"}` correctly appends to the args array.
- HPA utilization formula `(current / request) * 100` matches the official algorithm.
- Scaling formula `desiredReplicas = ceil(currentReplicas * (currentMetricValue / desiredMetricValue))` matches the official Kubernetes HPA algorithm.
- `autoscaling/v2` is the current stable HPA API and supports `behavior`, multiple metrics, and `Utilization`/`AverageValue` target types as shown.
- "When multiple metrics are specified, HPA picks the metric requiring the most replicas" is correct behavior per K8s docs.
- Default scale-down stabilization window of 300s (5 minutes) is correct.
- `kube_horizontalpodautoscaler_status_current_replicas` and `kube_horizontalpodautoscaler_spec_max_replicas` are valid kube-state-metrics names.
- busybox 1.36 includes the wget applet, so the load generator command works as written.

## Review Notes
- The post is Talos-flavored but the configuration is largely vanilla Kubernetes — that is appropriate since HPA itself is not Talos-specific. The Talos angle is correctly limited to the `--kubelet-insecure-tls` patch note.
- nginx:1.25 is pinned to a slightly older minor; later nginx tags exist but 1.25 remains valid and pullable. No change needed.
- The autoscaling algorithm formula shown is a simplified version that omits the tolerance threshold (default ±10%) — this is a common simplification and matches what the docs use for illustration, so it is not incorrect.
- The `kubectl run ... --restart=Never` pattern is still supported in current kubectl; generator deprecations removed Deployment-style `kubectl run` but not the bare-Pod form used here.
