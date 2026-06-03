# Validation Summary: How to Use Zero-Downtime Kubernetes Version Upgrades with Node Pool Rotation

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Kubernetes
- PodDisruptionBudget
- Deployments and StatefulSets
- kubectl cordon and drain
- Google Kubernetes Engine (GKE) and gcloud CLI
- Amazon EKS managed node groups and eksctl
- Azure Kubernetes Service (AKS) and Azure CLI
- Prometheus / kube-state-metrics

## Sources Consulted
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes PodDisruptionBudget API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- Kubernetes container lifecycle hooks documentation: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Google Cloud GKE node pool and auto-upgrade documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/node-auto-upgrades
- eksctl nodegroups documentation: https://docs.aws.amazon.com/eks/latest/eksctl/nodegroups.html
- eksctl managed nodegroups documentation: https://docs.aws.amazon.com/eks/latest/eksctl/nodegroup-managed.html
- Azure CLI AKS nodepool documentation: https://learn.microsoft.com/en-us/cli/azure/aks/nodepool
- AKS system node pool documentation: https://learn.microsoft.com/en-us/azure/aks/use-system-pools

## Issues Found
- The Deployment YAML omitted the required `spec.selector` and matching pod template labels for `apps/v1`. Added `selector.matchLabels` and `template.metadata.labels`.
- The StatefulSet YAML omitted the required `spec.selector` and matching pod template labels. Added both so the manifest is valid.
- The GKE and AKS examples used hard-coded Kubernetes patch versions that can become unavailable. Replaced them with a `TARGET_VERSION` variable in each command.
- The EKS managed node group command used `--version`, but eksctl documents that `--version` is not supported for managed node groups. Removed the flag and added a note that managed node groups inherit the control plane Kubernetes version.
- The AKS node pool example created a `System` node pool for workload rotation. Changed it to `User`, which is the appropriate mode for application workloads.
- The `kubectl drain` examples set `--grace-period=60` while the text said the command respects each pod's configured termination grace period. Removed the override so Kubernetes uses pod-level termination grace periods.
- The automation script counted DaemonSet pods after drain, but `kubectl drain --ignore-daemonsets` intentionally leaves DaemonSet-managed pods on the node. Updated the verification step to count non-DaemonSet pods.
- The pod creation PromQL example used `rate()` on `kube_pod_created`, which is a timestamp gauge from kube-state-metrics rather than a counter. Updated it to count pods created in the last five minutes.
- The Prometheus scheduling latency metric used `scheduler_scheduling_duration_seconds_bucket`, which is not the current Kubernetes scheduler metric. Updated it to `scheduler_scheduling_attempt_duration_seconds_bucket`.
- The failed scheduling query used `kube_pod_failed`, which is not a kube-state-metrics pod metric. Updated it to use `scheduler_schedule_attempts_total{result="unschedulable"}`.

## Review Notes
The commands remain provider-specific examples and still require the target Kubernetes version to be available for the cluster, region, and control plane version. The GKE node label shown for validation is GKE-specific; EKS and AKS environments should use their provider-specific node pool labels or node names when adapting the example.
