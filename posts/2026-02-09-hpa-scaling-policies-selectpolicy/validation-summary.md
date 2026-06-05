# Validation Summary: How to Configure HPA Scaling Policies with selectPolicy Max, Min, or Disabled

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Kubernetes HorizontalPodAutoscaler autoscaling/v2
- HPA scaling behavior, policies, stabilization windows, and selectPolicy
- kubectl
- Kubernetes CronJob
- Prometheus / PromQL alerting
- kube-state-metrics HPA metrics

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling concept documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes autoscaling/v2 HorizontalPodAutoscaler API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl describe reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Kubernetes discussion / release-note context for multiple HPAs selecting the same pods: https://discuss.kubernetes.io/t/hpa-behaviour-was-not-considered-in-hpa-ambiguous-selector-112011-fix/25928
- Prometheus PromQL function documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics

## Issues Found
- The post incorrectly stated that `selectPolicy: Disabled` ignores policies and allows unlimited scaling. Kubernetes documentation states that `Disabled` turns off scaling in the configured direction. Updated the explanation, example, use cases, and best-practice note accordingly.
- The time-based policy section used multiple HPA resources plus `schedule` annotations as if annotations would activate or deactivate HPAs. Kubernetes annotations do not schedule HPAs, and multiple HPAs targeting the same workload can compete for the same scale target. Replaced this with a single HPA and a CronJob that patches that HPA.
- The monitoring section showed a fictional `SelectPolicy` event. Kubernetes HPA emits `SuccessfulRescale` events for scaling decisions, but does not emit a separate selected-policy event. Removed the invalid event and adjusted the wording.
- The scale-down description said the 5% policy was strictly "at most 5% every 90 seconds." Kubernetes rounds percentage-based pod changes up, so this can permit at least one pod even when 5% is fractional. Updated the description to mention rounding.

## Review Notes
The examples use `autoscaling/v2`, which is the current stable HPA API. The Prometheus alert assumes kube-state-metrics is installed and exporting `kube_horizontalpodautoscaler_status_current_replicas`.
