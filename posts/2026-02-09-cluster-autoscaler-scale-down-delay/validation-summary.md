# Validation Summary: How to Tune Cluster Autoscaler Scale-Down Delay and Utilization Threshold

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Cluster Autoscaler
- AWS Auto Scaling Groups
- kubectl
- PodDisruptionBudget
- PriorityClass
- jq

## Sources Consulted
- Kubernetes Cluster Autoscaler FAQ: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md
- Kubernetes Cluster Autoscaler AWS cloud provider documentation: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/aws/README.md
- Kubernetes Pod Disruptions documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes Pod Priority and Preemption documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes PriorityClass API reference: https://kubernetes.io/docs/reference/kubernetes-api/scheduling-resources/priority-class-v1/
- AWS CLI create-or-update-tags command reference: https://docs.aws.amazon.com/cli/latest/reference/autoscaling/create-or-update-tags.html

## Issues Found
- Corrected the scale-down parameter explanation. The original text treated "scale-down delay" as the underutilization duration, but Cluster Autoscaler uses `--scale-down-unneeded-time` for how long a node must be unneeded and separate delay flags for pauses after add, delete, or failure events.
- Corrected the utilization threshold direction. The original text said higher thresholds are more conservative and lower thresholds are more aggressive, which is backwards. Higher thresholds make more nodes eligible for scale-down; lower thresholds restrict candidates to more lightly requested nodes.
- Updated example threshold values and descriptions so conservative examples use lower thresholds and aggressive examples use higher thresholds.
- Replaced the deprecated `k8s.gcr.io` image registry and old `v1.27.0` example image with `registry.k8s.io/autoscaling/cluster-autoscaler:v1.35.0`.
- Removed `--scale-down-enabled=true` from the baseline example because the flag is deprecated in current Cluster Autoscaler help output. The post still notes that `--scale-down-enabled=false` is deprecated when used as a temporary pause option on versions that support it.
- Replaced the incorrect per-node annotation example for per-node-group scale-down tuning with AWS Auto Scaling Group `node-template/autoscaling-options` tags.
- Corrected the monitoring command comment that described the `scale-down-disabled` annotation as pending deletion. The annotation disables scale-down for a node; it does not indicate a pending deletion.
- Clarified that `kubectl top nodes` shows live metrics, while Cluster Autoscaler scale-down utilization is request-based.
- Clarified system pod and DaemonSet behavior. Setting `--skip-nodes-with-system-pods=false` does not guarantee every system pod can be removed; PDBs and scheduling constraints can still block scale-down.
- Corrected the PriorityClass example. The original values and explanation implied low-priority pods directly influence scale-down, but Cluster Autoscaler uses `--expendable-pods-priority-cutoff`; pods below that cutoff do not prevent scale-down.
- Corrected the AWS node group configuration section so scale-down behavior is configured through supported autoscaling-option tags rather than a generic scheduling label or a global command flag.

## Review Notes
- Cluster Autoscaler versions should generally match the Kubernetes minor version of the cluster. The image tag in the example was updated to a current tag, but production users should choose the tag matching their cluster version.
- The examples assume AWS. Other cloud providers may not support the same per-node-group autoscaling-option tag mechanism.
