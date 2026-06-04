# Validation Summary: How to Prevent Cluster Autoscaler from Removing Nodes with Important Pods

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Cluster Autoscaler
- PodDisruptionBudgets
- Pod annotations and node annotations
- Kubernetes PriorityClass
- Prometheus metrics and alerting

## Sources Consulted
- Kubernetes Cluster Autoscaler FAQ: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md
- Kubernetes Cluster Autoscaler README and release guidance: https://github.com/kubernetes/autoscaler/tree/master/cluster-autoscaler#releases
- Kubernetes Pod disruptions documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes PodDisruptionBudget API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- Kubernetes PDB configuration guide: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes Pod Priority and Preemption documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes critical add-on pod scheduling documentation: https://kubernetes.io/docs/tasks/administer-cluster/guaranteed-scheduling-critical-addon-pods/
- kubectl annotate reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/
- Cluster Autoscaler metrics proposal: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/proposals/metrics.md

## Issues Found
- The post listed DaemonSet pods as a general scale-down blocker. Cluster Autoscaler treats DaemonSet pods specially and can evict them depending on configuration, so the list was changed to scheduling constraints and pods not backed by controller objects.
- The local storage explanation implied every emptyDir volume is local storage. Cluster Autoscaler treats disk-backed emptyDir as local storage, while memory-backed emptyDir is not considered local storage, so the wording was narrowed.
- The system pod section claimed that combining `safe-to-evict: "false"` with `system-cluster-critical` ensures pods are never evicted for scale-down. The priority class marks pods as critical for scheduling and preemption; the Cluster Autoscaler blocker is the `safe-to-evict: "false"` annotation. The wording was corrected.
- The Cluster Autoscaler example used `--scale-down-enabled=true`, which the current Cluster Autoscaler FAQ marks as deprecated. The flag was removed.
- The Cluster Autoscaler image tag was outdated for a current example. It was updated to `v1.34.3`, with a note to match the Cluster Autoscaler minor version to the Kubernetes minor version.
- The node pool example included a ConfigMap that would not configure Cluster Autoscaler scale-down behavior and an invalid Deployment missing a selector and pod labels. The ConfigMap was removed and the Deployment was made valid.
- The alert expression did not actually identify unneeded nodes blocked from scale-down. It now uses the documented `cluster_autoscaler_unneeded_nodes_count` metric.

## Review Notes
The corrected examples remain illustrative. Real Cluster Autoscaler deployment flags and node group configuration vary by cloud provider, managed Kubernetes service, and installation method.
