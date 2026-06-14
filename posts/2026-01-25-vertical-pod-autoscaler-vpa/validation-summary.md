# Validation Summary: How to Set Up Vertical Pod Autoscaler (VPA)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Vertical Pod Autoscaler (VPA)
- Horizontal Pod Autoscaler (HPA)
- kubectl
- Helm
- Prometheus
- Grafana
- kube-state-metrics
- PodDisruptionBudget

## Sources Consulted
- Kubernetes Vertical Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes Autoscaler VPA installation documentation: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/installation.md
- Kubernetes Autoscaler VPA API reference: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/api.md
- Kubernetes Autoscaler VPA quickstart: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/quickstart.md
- Kubernetes Autoscaler VPA components documentation: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/components.md
- Kubernetes Autoscaler VPA updater metrics source: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/utils/metrics/updater/updater.go
- Kubernetes Autoscaler VPA recommender metrics source: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/utils/metrics/recommender/recommender.go
- Fairwinds VPA Helm chart repository and values: https://github.com/FairwindsOps/charts/tree/master/stable/vpa

## Issues Found
- The post used `updateMode: "Auto"` for VPA update policy examples. Upstream VPA documentation marks `Auto` as deprecated since VPA 1.4.0 and recommends explicit modes such as `Recreate` or `InPlaceOrRecreate`. Changed update policy examples and workflow text to use `updateMode: "Recreate"`.
- The monitoring section listed non-existent VPA component metrics for recommendations: `vpa_recommender_recommendation_cpu_cores` and `vpa_recommender_recommendation_memory_bytes`. Replaced them with current VPA component metrics, `vpa_recommender_vpa_objects_count` and `vpa_recommender_recommendation_latency_seconds`, and clarified that recommendation values should be exposed from `VerticalPodAutoscaler` status through kube-state-metrics custom resource metrics.
- The troubleshooting section listed "Pod has no resource requests" as a common reason VPA does not provide recommendations. VPA is designed to recommend and set requests based on usage and does not require existing requests in the same way HPA CPU utilization does. Replaced it with "No pods match the VPA targetRef selector."

## Review Notes
- The post remains accurate for the upstream VPA `autoscaling.k8s.io/v1` API. `mode: "Auto"` under `resourcePolicy.containerPolicies` was intentionally left unchanged because it is a different enum from `updatePolicy.updateMode` and remains valid for container scaling mode.
- The Grafana metric name for VPA recommendations depends on the kube-state-metrics custom resource metrics configuration. The post now notes that recommendation values require exposing VPA status through kube-state-metrics.
