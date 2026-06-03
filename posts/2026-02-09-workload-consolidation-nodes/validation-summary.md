# Validation Summary: How to Implement Workload Consolidation for Reduced Node Count

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Metrics Server
- Vertical Pod Autoscaler
- Cluster Autoscaler
- Descheduler
- Pod Disruption Budgets
- Node affinity
- Prometheus alerting and recording rules
- kubectl

## Sources Consulted
- Kubernetes Metrics Server README: https://github.com/kubernetes-sigs/metrics-server
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Vertical Pod Autoscaler documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes Autoscaler repository and Cluster Autoscaler FAQ: https://github.com/kubernetes/autoscaler and https://github.com/kubernetes/autoscaler/blob/cluster-autoscaler-1.28.0/cluster-autoscaler/FAQ.md
- Kubernetes Descheduler v0.28.0 documentation: https://github.com/kubernetes-sigs/descheduler/blob/v0.28.0/README.md
- Kubernetes PodDisruptionBudget API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- Kubernetes node affinity documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Prometheus alerting and recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/ and https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/

## Issues Found
- The Metrics Server example was an incomplete Deployment-only manifest and used an older pinned image. Replaced it with the official `components.yaml` install command so the required RBAC, Service, APIService, and current release manifest are applied together.
- The `kubectl top pods` filtering command included the header row and relied on loose string coercion. Added `--no-headers` and an explicit numeric comparison.
- The VPA example placed `updateMode` directly under `spec`, but the `autoscaling.k8s.io/v1` API expects it under `spec.updatePolicy`. Moved it to the correct field path.
- The Cluster Autoscaler AWS example did not specify node groups or node group auto-discovery, so it would not know what to scale. Added the AWS ASG tag-based auto-discovery flag and removed the unnecessary `--scale-down-enabled=true` flag.
- The Descheduler policy used deprecated `descheduler/v1alpha1` syntax and described `LowNodeUtilization` as a consolidation strategy. Updated the policy to `descheduler/v1alpha2`, switched to `HighNodeUtilization`, and clarified that compaction requires scheduler scoring with `MostAllocated`.
- The `general-app` Deployment example omitted the required `spec.selector` and matching pod template labels for `apps/v1`. Added both fields.

## Review Notes
- The Cluster Autoscaler and Descheduler manifests are still illustrative snippets; production installs also need the correct RBAC, cloud permissions, and scheduler configuration for the target cluster.
- The Prometheus rule examples are syntactically valid, but the kube-state-metrics metric names and labels should be checked against the exact kube-state-metrics version deployed in a real cluster.
