# Validation Summary: How to Set Up Horizontal Pod Autoscaling (HPA) in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler (HPA), `autoscaling/v2` API
- Kubernetes Metrics Server
- Prometheus Adapter (custom metrics API)
- Vertical Pod Autoscaler (VPA)
- PodDisruptionBudget (`policy/v1`)
- kube-state-metrics + Prometheus Operator (`PrometheusRule`)
- KEDA (referenced for external/scale-to-zero)
- kubectl, Helm, load-testing tools (hey, k6, busybox/wget)

## Sources Consulted
- Kubernetes HPA documentation — https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
- Kubernetes HPA walkthrough — https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- HPA scaling behavior / `behavior` field — https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#configurable-scaling-behavior
- Kubernetes Metrics Server — https://github.com/kubernetes-sigs/metrics-server
- Prometheus Adapter — https://github.com/kubernetes-sigs/prometheus-adapter
- Vertical Pod Autoscaler — https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler
- PodDisruptionBudget docs — https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- kube-state-metrics HPA metrics — https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/horizontalpodautoscaler-metrics.md

## Issues Found
- **Scale-up "Aggressive" prose inconsistent with the config it describes** (Scale-Up Patterns section). The intro text said the configuration "doubles capacity every 15 seconds," but the accompanying YAML uses a `Percent` policy with `value: 200`. A `Percent` policy allows the replica count to grow by that percentage of the current count, so `value: 200` triples the pod count (and the YAML's own inline comment correctly says "Triple pods if needed"). Changed the prose from "doubles capacity" to "triples capacity" to match the config and the inline comment.

## Review Notes
- The desired-replicas formula (`ceil[currentReplicas * (currentMetricValue / desiredMetricValue)]`) matches the official Kubernetes algorithm.
- The default HPA sync interval of 15s shown in the diagram is correct (`--horizontal-pod-autoscaler-sync-period`).
- `autoscaling/v2` is the correct, GA API (stable since Kubernetes 1.23); `Resource`/`Pods`/`External` metric types and `Utilization`/`AverageValue` targets are all valid.
- The metrics-server install URL, `--kubelet-insecure-tls` JSON patch, and verification commands (`kubectl top`, `kubectl get apiservice v1beta1.metrics.k8s.io`) are accurate.
- Multiple-metrics behavior ("calculate per metric, take the maximum") is correct.
- `behavior` block fields (`stabilizationWindowSeconds`, `policies`, `selectPolicy: Max/Min`, `Percent`/`Pods` types) are all valid and used correctly.
- kube-state-metrics names `kube_horizontalpodautoscaler_status_current_replicas` and `kube_horizontalpodautoscaler_spec_max_replicas` are correct.
- VPA `controlledResources: ["memory"]` to avoid CPU conflict with HPA is the recommended pattern.
- The `minReplicas: 1 # Can scale to zero with KEDA` comment is slightly loose — vanilla HPA can only scale to zero behind the alpha `HPAScaleToZero` feature gate; scale-to-zero is normally achieved via KEDA. The comment is accurate enough as written and was left unchanged.
- The Prometheus Adapter `seriesQuery`/`metricsQuery`/name-rewrite rules and the `williamyeh/hey` load-test image are valid; left unchanged.
