# Validation Summary: How to Configure HPA minReplicas and maxReplicas Boundaries

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes HorizontalPodAutoscaler autoscaling/v2
- Kubernetes Deployment rolling updates
- Kubernetes PodDisruptionBudget policy/v1
- kubectl
- jq
- Prometheus and kube-state-metrics

## Sources Consulted
- Kubernetes HorizontalPodAutoscaler autoscaling/v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Horizontal Pod Autoscaling concepts: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes PodDisruptionBudget policy/v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- Kubernetes Deployment rolling update documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes node allocatable resource documentation: https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/
- Kubernetes resource requests and scheduling documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- kube-state-metrics HorizontalPodAutoscaler metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/horizontalpodautoscaler-metrics.md

## Issues Found
- The cluster capacity calculation used `.status.capacity` for node CPU and memory. Kubernetes scheduling is based on allocatable resources available to pods, so I changed the command and example wording to use `.status.allocatable`.
- The `HPAOverProvisionedMin` Prometheus alert used the raw `container_cpu_usage_seconds_total` counter and attempted to combine pod-level CPU series with HPA-level kube-state-metrics series without a valid generic label relationship. I removed the invalid CPU clause and added explicit HPA label matching for the `ScalingLimited` condition.

## Review Notes
The HPA examples use the current `autoscaling/v2` API and valid `Resource` metric target fields. `scaleTargetRef.apiVersion` is shown in the first full example and omitted in several compact examples; the Kubernetes API reference marks `kind` and `name` as required for `CrossVersionObjectReference`, while `apiVersion` is optional. The kubectl JSON patch examples are consistent with the official `kubectl patch --type=json -p='[...]'` syntax.
