# Validation Summary: Resize or Change EC2 Types in a kOps InstanceGroup Without Rebuilding

## Status

validated

## Post Type

Technical tutorial and operational guide

## Technologies Covered

- kOps InstanceGroups and the kOps CLI
- Kubernetes nodes, scheduling, draining, and PodDisruptionBudgets
- Amazon EC2 instance types, Auto Scaling groups, and launch templates
- AWS Mixed Instances Policies
- Kubernetes Cluster Autoscaler for AWS
- Karpenter-managed kOps InstanceGroups

## Sources Consulted

- [kOps: Working with Instance Groups](https://kops.sigs.k8s.io/tutorial/working-with-instancegroups/)
- [kOps: InstanceGroup Resource](https://kops.sigs.k8s.io/instance_groups/)
- [kOps API reference for InstanceGroupSpec and RollingUpdate](https://pkg.go.dev/k8s.io/kops/pkg/apis/kops)
- [kOps CLI: `kops update cluster`](https://kops.sigs.k8s.io/cli/kops_update_cluster/)
- [kOps CLI: `kops rolling-update cluster`](https://kops.sigs.k8s.io/cli/kops_rolling-update_cluster/)
- [kOps: Rolling Updates](https://kops.sigs.k8s.io/operations/rolling-update/)
- [kOps CLI: `kops validate cluster`](https://kops.sigs.k8s.io/cli/kops_validate_cluster/)
- [kOps: Karpenter](https://kops.sigs.k8s.io/operations/karpenter/)
- [kOps v1.36.1 rolling-update drain implementation](https://github.com/kubernetes/kops/blob/v1.36.1/pkg/instancegroups/instancegroups.go)
- [Kubernetes: Disruptions](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/)
- [Kubernetes: Well-Known Labels, Annotations and Taints](https://kubernetes.io/docs/reference/labels-annotations-taints/)
- [Kubernetes Cluster Autoscaler: AWS provider documentation](https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/aws/README.md)
- [AWS: Amazon EC2 instance types](https://docs.aws.amazon.com/ec2/latest/instancetypes/instance-types.html)
- [AWS: General purpose instance specifications](https://docs.aws.amazon.com/ec2/latest/instancetypes/gp.html)
- [AWS: Amazon Machine Images](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AMIs.html)
- [AWS: Maximum IP addresses per network interface](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AvailableIpPerENI.html)

## Issues Found

- The opening described every AWS InstanceGroup as an Auto Scaling group backed by a launch template. kOps 1.36 also supports `spec.manager: Karpenter`, which generates Karpenter `NodePool` and `EC2NodeClass` resources instead. The introduction now scopes the procedure to Auto Scaling group-backed InstanceGroups and excludes Karpenter-managed groups.
- The mixed-instance guidance assumed every `mixedInstancesPolicy` uses an explicit instance list. Current kOps also supports attribute-based `instanceRequirements`. The guidance now tells readers to update `instances` or `instanceRequirements`, as applicable, and limits the Cluster Autoscaler first-override warning to explicit instance lists.
- The surge-capacity warning referred vaguely to `maxSize` accommodation. kOps implements AWS surge by detaching old instances before their replacements launch, so detached instances no longer count toward the Auto Scaling group. The post now explains this behavior and clarifies that total running nodes can temporarily exceed the configured `maxSize`, while EC2 quotas and subnet addresses must still accommodate the extra nodes.
- The rolling-update failure advice listed pods using local storage as a drain blocker. kOps v1.36.1 invokes the Kubernetes drain helper with `DeleteEmptyDirData: true`, so `emptyDir` data does not block the drain and can be deleted. The post now gives the appropriate data-loss warning instead.
- The rollback procedure restored only `machineType`, which would not fully roll back a group whose effective instance types come from `mixedInstancesPolicy`. It now instructs readers to restore the prior mixed-instance configuration when applicable.

## Review Notes

- All kOps commands and flags in the post were checked against the current official CLI documentation and the kOps v1.36.1 source. The `--instance-group`, `--yes`, `--force`, and `--wait` usages are valid.
- The `apiVersion`, `machineType`, `mixedInstancesPolicy`, `rollingUpdate.maxSurge`, and `rollingUpdate.maxUnavailable` fields are current. On AWS, current kOps defaults `maxSurge` to 1; setting it explicitly as shown is valid and documents the intended strategy.
- The Kubernetes node labels, `kubectl` commands, PodDisruptionBudget behavior, and Cluster Autoscaler's first-override behavior for AWS Mixed Instances Policies are current.
- All external links in the post resolve to the intended official documentation.
