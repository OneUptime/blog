# Validation Summary: kOps Spot Node Groups with `MixedInstancesPolicy` and On-Demand Fallback

## Status

validated

## Post Type

Technical guide / tutorial

## Technologies Covered

- kOps 1.36 InstanceGroups and managed addons
- Kubernetes node labels, taints, tolerations, PodDisruptionBudgets, and Cluster Autoscaler
- Amazon EC2 Auto Scaling Mixed Instances Policies
- Amazon EC2 Spot and On-Demand Instances
- AWS Capacity Rebalancing and AWS Node Termination Handler
- AWS CLI, kOps CLI, and kubectl

## Sources Consulted

- [kOps InstanceGroup resource and `mixedInstancesPolicy` fields](https://kops.sigs.k8s.io/instance_groups/)
- [kOps 1.36.1 API types and supported Spot allocation strategies](https://pkg.go.dev/k8s.io/kops@v1.36.1/pkg/apis/kops)
- [kOps `toolbox instance-selector` CLI reference](https://kops.sigs.k8s.io/cli/kops_toolbox_instance-selector/)
- [kOps `update cluster` CLI reference](https://kops.sigs.k8s.io/cli/kops_update_cluster/)
- [kOps `rolling-update cluster` CLI reference](https://kops.sigs.k8s.io/cli/kops_rolling-update_cluster/)
- [kOps rolling-update behavior and strategies](https://kops.sigs.k8s.io/operations/rolling-update/)
- [kOps managed Cluster Autoscaler and Node Termination Handler addons](https://kops.sigs.k8s.io/addons/)
- [Kubernetes Cluster Autoscaler AWS provider documentation](https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/aws/README.md)
- [AWS `InstancesDistribution` API reference](https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_InstancesDistribution.html)
- [AWS Mixed Instances Policy scaling behavior](https://docs.aws.amazon.com/autoscaling/ec2/userguide/mixed-instances-groups-set-up-overview.html)
- [AWS allocation strategies for multiple instance types](https://docs.aws.amazon.com/autoscaling/ec2/userguide/allocation-strategies.html)
- [AWS Capacity Rebalancing behavior](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-capacity-rebalancing.html)
- [AWS behavior when updating an Auto Scaling group](https://docs.aws.amazon.com/autoscaling/ec2/userguide/update-auto-scaling-group.html)
- [AWS CLI `describe-auto-scaling-groups` reference](https://docs.aws.amazon.com/cli/latest/reference/autoscaling/describe-auto-scaling-groups.html)
- [AWS CLI `describe-scaling-activities` reference](https://docs.aws.amazon.com/cli/latest/reference/autoscaling/describe-scaling-activities.html)
- [AWS CLI `describe-instances` reference](https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html)
- [AWS Auto Scaling instance tagging lifecycle](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-tagging.html)
- [AWS EC2 general-purpose instance specifications](https://aws.amazon.com/ec2/instance-types/general-purpose/)
- [AWS Node Termination Handler documentation](https://github.com/aws/aws-node-termination-handler)
- [Kubernetes taints and tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)
- [Kubernetes Pod disruption behavior](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/)

## Issues Found

- The original verification procedure implied that `describe-auto-scaling-groups` could show the Spot/On-Demand mix. Its `Instances[].LifecycleState` field reports Auto Scaling states such as `Pending` and `InService`, not the EC2 purchase option. Added a scoped `aws ec2 describe-instances` command that reads `InstanceLifecycle`, and clarified that `spot` identifies Spot while a missing/null value identifies On-Demand.
- The original checklist told readers to inspect failed scaling activities and capacity errors after running only `describe-auto-scaling-groups`, whose response does not contain scaling activity records. Added `aws autoscaling describe-scaling-activities --auto-scaling-group-name ASG_NAME`, which exposes `StatusCode` and `StatusMessage` for failed or cancelled launches.
- The rolling-update warning described a full rotation as a simultaneous Spot-capacity request. kOps updates one InstanceGroup at a time and its default worker strategy replaces incrementally; parallelism requires a larger `rollingUpdate.maxUnavailable` or `maxSurge`. Reworded the warning to describe the rollout accurately as a series of Spot-capacity requests.

## Review Notes

- The post was reviewed against the current stable kOps CLI, version 1.36.1. The documented command names and flags were also checked directly with that binary's `--help` output.
- The current kOps API accepts `price-capacity-optimized`, although the prose in the kOps InstanceGroup documentation still emphasizes the older `capacity-optimized` strategy. The post correctly advises checking the managing kOps release before applying the value.
- The four example EC2 instance types all advertise 4 vCPUs and 16 GiB of memory and use x86-64, but their CPU implementations and performance differ. The post correctly requires workload-specific review and per-AZ offering checks.
- The post correctly explains that the configured On-Demand percentage is a target distribution, not automatic On-Demand fallback for unfulfilled Spot capacity; that Cluster Autoscaler models a Mixed Instances Policy from the first override; that Capacity Rebalancing can exceed maximum group size by up to 10% of desired capacity; and that PDBs do not prevent involuntary Spot loss.
