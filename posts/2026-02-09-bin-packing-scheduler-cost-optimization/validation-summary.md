# Validation Summary: How to Configure Bin Packing Scheduler Profile for Cost Optimization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes scheduler profiles
- kube-scheduler component configuration
- NodeResourcesFit and NodeResourcesBalancedAllocation scheduler plugins
- Cluster Autoscaler
- Pod topology spread constraints
- PriorityClass and preemption
- kubectl commands

## Sources Consulted
- Kubernetes scheduler configuration reference: https://kubernetes.io/docs/reference/scheduling/config/
- Kubernetes kube-scheduler configuration API reference: https://kubernetes.io/docs/reference/config-api/kube-scheduler-config.v1/
- Kubernetes kube-scheduler command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-scheduler/
- Kubernetes multiple schedulers guide: https://kubernetes.io/docs/tasks/extend-kubernetes/configure-multiple-schedulers/
- Kubernetes pod topology spread constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes pod priority and preemption: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes Cluster Autoscaler FAQ: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md

## Issues Found
- The post described the default scheduler as using a balanced allocation strategy that spreads pods across nodes. Updated this to reflect the actual default resource scoring behavior: `NodeResourcesFit` defaults to `LeastAllocated`, while `NodeResourcesBalancedAllocation` separately favors balanced CPU and memory usage.
- The custom scheduler deployment used `serviceAccountName: kube-scheduler` without defining the service account or RBAC bindings needed by a scheduler running as a Deployment. Added a dedicated ServiceAccount, ClusterRoleBindings for `system:kube-scheduler` and `system:volume-scheduler`, and the standard authentication ConfigMap RoleBinding.
- The Cluster Autoscaler example used a generic ConfigMap with JSON keys that are not the upstream Cluster Autoscaler configuration mechanism. Replaced it with a Deployment args excerpt using the official scale-down flags.
- The Cluster Autoscaler explanation implied nodes are removed solely when utilization drops below 50%. Updated it to clarify that nodes become candidates only when requested-resource utilization is below the threshold and movable pods can fit elsewhere.
- The resource fragmentation example said node affinity would drain fragmented nodes. Updated the comment and explanation to clarify that affinity avoids placing new pods on manually marked nodes; it does not drain existing pods by itself.
- The testing section labeled `.status.allocatable.cpu` as `CPU-USED`. Renamed the output column to `CPU-ALLOCATABLE` and clarified the command shows allocatable capacity.

## Review Notes
- The kube-scheduler and Cluster Autoscaler examples use versioned images. In real clusters, those image tags should be chosen to match the Kubernetes/control-plane and autoscaler version compatibility for the environment.
- `kubectl top nodes` requires Metrics Server or another resource metrics provider.
- The post's general bin-packing approach is valid, but production clusters should test scheduler profile changes carefully because scoring plugins interact with other constraints such as affinity, topology spread, taints, and volume binding.
