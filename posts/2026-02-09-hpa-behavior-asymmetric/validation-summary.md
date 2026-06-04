# Validation Summary: How to configure HPA with behavior policies for asymmetric scaling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes HorizontalPodAutoscaler
- Kubernetes `autoscaling/v2` API
- HPA behavior policies and stabilization windows
- Kubernetes custom and resource metrics
- kube-state-metrics
- Prometheus / PromQL
- Go `client-go`
- `kubectl`

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes `autoscaling/v2` HorizontalPodAutoscaler API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- kube-state-metrics HorizontalPodAutoscaler metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/horizontalpodautoscaler-metrics.md
- Prometheus PromQL function documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- Corrected the version/API wording for HPA behavior policies. The original text implied the behavior field was introduced directly in the stable `autoscaling/v2` HPA; it was available in `autoscaling/v2beta2` from Kubernetes 1.18 and is stable in `autoscaling/v2`.
- Clarified stabilization-window semantics. The original text described stabilization as waiting before decisions and using past metric values. Kubernetes considers past desired replica recommendations; for scale-down it uses the highest recommendation in the window.
- Clarified policy examples that described scaling as unconditional. Percent and Pods policies limit how much HPA may change replicas during a period when metrics require scaling.
- Corrected the burst-scaling explanation. A `Percent` policy with value `200` allows adding up to 200% of the current replica count, rather than simply "tripling capacity" as an unconditional action.
- Corrected the business-hours automation description. The Go sample is a long-running in-cluster controller loop, not a Kubernetes CronJob.
- Corrected the multiple-metrics wording. HPA can evaluate multiple metrics and choose the largest recommendation, but behavior policies apply uniformly to the resulting scaling decision rather than separately per metric.
- Corrected kube-state-metrics metric names and PromQL. Replaced non-existent `kube_hpa_*` metrics and `kube_hpa_status_last_scale_time` with documented `kube_horizontalpodautoscaler_*` metrics, and used `deriv()` for gauge velocity instead of `rate()`.
- Corrected alert template labels from `$labels.hpa` to `$labels.horizontalpodautoscaler`, matching kube-state-metrics labels.

## Review Notes
The YAML examples use current `autoscaling/v2` HPA fields and valid policy types. The Go sample uses current `client-go` `AutoscalingV2()` APIs, but Go tooling was not installed in the workspace, so `gofmt`/compile verification could not be run locally.
