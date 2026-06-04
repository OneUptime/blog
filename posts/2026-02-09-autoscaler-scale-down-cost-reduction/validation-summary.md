# Validation Summary: How to Use Kubernetes Cluster Autoscaler Scale-Down Policies for Cost Reduction

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes Cluster Autoscaler
- AWS Auto Scaling Groups
- PodDisruptionBudgets
- kubectl
- Prometheus / PromQL

## Sources Consulted
- Kubernetes Autoscaler FAQ: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md
- Kubernetes Autoscaler AWS provider documentation: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/aws/README.md
- Kubernetes Autoscaler metrics proposal: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/proposals/metrics.md
- Kubernetes PodDisruptionBudget API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- Kubernetes disruptions documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes Autoscaler releases: https://github.com/kubernetes/autoscaler/releases

## Issues Found
- The scale-down mechanics described CPU and memory requests as a combined total below 50% of node capacity. Cluster Autoscaler uses the maximum of CPU-request utilization and memory-request utilization against allocatable resources, so the explanation was corrected.
- The Cluster Autoscaler deployment used an outdated `v1.28.0` image without noting version matching. It was updated to `v1.35.0`, and a note was added to use an image matching the cluster minor version.
- The AWS Cluster Autoscaler deployment did not specify node group discovery or explicit node groups, so it would not know which AWS Auto Scaling Groups to manage. Added `--node-group-auto-discovery` with the official AWS tag pattern.
- The example included `--scale-down-enabled=true`, which is deprecated in current Cluster Autoscaler documentation and redundant because scale-down is enabled by default. Removed the flag.
- The critical workload Deployment example was invalid for `apps/v1` because it had no required `spec.selector`, and the pod template had no matching labels. Added a selector and matching template labels.
- The text said the `safe-to-evict: "false"` pod annotation prevents node scale-down. It more precisely prevents evicting that pod during node scale-down, so the wording was corrected.
- The time-based scaling section referred to node pool scheduling, but the commands scale a Deployment's replicas. The wording was corrected to workload replica reduction.
- The PromQL cost estimate used `cluster_autoscaler_nodes_count{state="scaleDown"}`, but official Cluster Autoscaler metrics define node states such as `ready`, `unready`, and `notStarted`; scale-down reasons are on `scaled_down_nodes_total`. Replaced it with an approximate ready-node reduction calculation and marked the hourly-cost input as a custom metric.

## Review Notes
The cron examples are crontab entries rather than commands to run directly in an interactive shell; they are technically valid when installed in an environment with working Kubernetes credentials. The cost-savings percentage remains environment-dependent, but it is presented as an outcome for variable workloads rather than a guaranteed result.
