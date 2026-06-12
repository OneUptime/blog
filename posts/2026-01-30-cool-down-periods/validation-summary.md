# Validation Summary: How to Build Cool-Down Periods

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler
- Kubernetes autoscaling/v2 API
- Kubernetes CronJob
- Kubernetes PodDisruptionBudget
- KEDA ScaledObject
- Prometheus and PromQL
- kube-state-metrics

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes Pod Disruptions documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes PodDisruptionBudget task documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes HPA controller source for stabilization recommendation behavior: https://github.com/kubernetes/kubernetes/blob/master/pkg/controller/podautoscaler/horizontal.go
- KEDA ScaledObject specification: https://keda.sh/docs/2.20/reference/scaledobject-spec/
- KEDA Prometheus scaler documentation: https://keda.sh/docs/2.20/scalers/prometheus/
- kube-state-metrics HorizontalPodAutoscaler metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/horizontalpodautoscaler-metrics.md
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- The post said HPA selects the highest recommendation for scale-up stabilization. Kubernetes uses the lowest recent recommendation for scale-up stabilization and the highest recent recommendation for scale-down stabilization. Updated the explanation.
- Some HPA policy comments described `periodSeconds` as an evaluation interval. In HPA behavior policies it is the time window over which the rate limit applies. Updated those comments.
- The `Pods` scale-up policy comments said the policy adds at least 4 pods. HPA policies define the maximum allowed change, and `selectPolicy: Max` chooses the policy that permits the largest change. Updated the comments to say "up to 4 pods."
- The KEDA hysteresis section implied KEDA provides native separate scale-up and scale-down thresholds for HPA scaling. Updated the wording to explain that Kubernetes HPA does not support separate thresholds directly and that KEDA can pass HPA behavior settings through a ScaledObject.
- The PodDisruptionBudget section implied PDBs prevent aggressive HPA scale-down. PDBs protect against voluntary evictions and do not directly limit HPA replica decisions. Updated the section to clarify the limitation.
- The Prometheus examples used outdated or incorrect kube-state-metrics HPA metric names such as `kube_hpa_status_current_replicas`. Updated them to current `kube_horizontalpodautoscaler_*` metric names and label names.
- The PromQL examples used `increase()` on HPA replica gauge metrics. Prometheus documents `increase()` for counters. Replaced those examples with `changes()` and fixed the max-replica duration query to use a boolean comparison.

## Review Notes
The HPA and KEDA examples use current API fields. The article uses "cool-down" as an explanatory term, while Kubernetes implements this behavior primarily through stabilization windows and scaling policies rather than a simple fixed post-action lockout.
