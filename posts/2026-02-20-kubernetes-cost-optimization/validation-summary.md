# Validation Summary: How to Reduce Kubernetes Costs Without Sacrificing Reliability

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes resource requests and limits
- kubectl metrics commands
- Cluster Autoscaler
- Google Kubernetes Engine Spot VMs
- Kubernetes ResourceQuota and LimitRange
- PodDisruptionBudget
- HorizontalPodAutoscaler
- Python subprocess and JSON parsing

## Sources Consulted
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes kubectl command reference for `kubectl top pod`: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes Cluster Autoscaler FAQ and parameter reference: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Google Kubernetes Engine Spot VMs documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/spot-vms
- Google Kubernetes Engine Spot VM how-to: https://cloud.google.com/kubernetes-engine/docs/how-to/spot-vms
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes LimitRange documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes PodDisruptionBudget API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/

## Issues Found
- The Cluster Autoscaler Deployment used `apps/v1` without an explicit `.spec.selector` and matching pod template labels. Kubernetes requires these fields for `apps/v1` Deployments, so I added a selector and matching labels.
- The Cluster Autoscaler example used `--min-nodes` and `--max-nodes`, which are not Cluster Autoscaler flags. I replaced them with `--nodes=2:20:default-node-pool`, the supported static node group format for setting minimum and maximum node group size.
- The Cluster Autoscaler example set `--scale-down-enabled=true`. The current Cluster Autoscaler parameter reference marks this flag as deprecated and scale-down defaults to enabled, so I removed it.
- The Spot VM snippet was labeled as a node pool YAML even though it contains a ConfigMap with notes and a workload Deployment, not a provider-specific node pool resource. I corrected the comments to describe it as spot-capable node pool guidance plus a workload example.

## Review Notes
- `kubectl` is not installed in this workspace, so CLI behavior was verified against the official generated kubectl reference rather than local `kubectl --help` output.
- The Python resource analyzer is illustrative and works for common CPU and memory units shown by Kubernetes and metrics-server, but it is not a complete parser for every Kubernetes quantity suffix.
- The GKE Spot VM workload example is valid for GKE-style labels and tolerations. The surrounding guidance should be adapted for other cloud providers because their spot/preemptible node labels and taints differ.
