# Validation Summary: How to Scale a kOps InstanceGroup Without Accidentally Upgrading Kubernetes

## Status
validated

## Post Type
Operations guide

## Technologies Covered
- kOps
- Kubernetes
- kOps Cluster and InstanceGroup resources
- Kubernetes Cluster Autoscaler
- Karpenter
- Amazon EC2 Auto Scaling groups and launch templates
- AWS CLI
- `kubectl`
- Terraform

## Sources Consulted
- kOps CLI: `kops update cluster` - https://kops.sigs.k8s.io/cli/kops_update_cluster/
- kOps CLI: `kops edit instancegroup` - https://kops.sigs.k8s.io/cli/kops_edit_instancegroup/
- kOps CLI: `kops get instancegroups` - https://kops.sigs.k8s.io/cli/kops_get_instancegroups/
- kOps CLI: `kops get clusters` - https://kops.sigs.k8s.io/cli/kops_get_clusters/
- kOps CLI: `kops validate cluster` - https://kops.sigs.k8s.io/cli/kops_validate_cluster/
- kOps: InstanceGroup Resource - https://kops.sigs.k8s.io/instance_groups/
- kOps v1.36.1 API reference: `InstanceGroupSpec` - https://pkg.go.dev/k8s.io/kops@v1.36.1/pkg/apis/kops#InstanceGroupSpec
- kOps: Working with Instance Groups - https://kops.sigs.k8s.io/tutorial/working-with-instancegroups/
- kOps: Updates and Upgrades - https://kops.sigs.k8s.io/operations/updates_and_upgrades/
- kOps: Upgrading Kubernetes with `kops reconcile cluster` - https://kops.sigs.k8s.io/tutorial/upgrading-kubernetes/
- kOps: Rolling Updates - https://kops.sigs.k8s.io/operations/rolling-update/
- kOps: Karpenter - https://kops.sigs.k8s.io/operations/karpenter/
- kOps: Terraform target - https://kops.sigs.k8s.io/terraform/
- kOps: Releases and Versioning - https://kops.sigs.k8s.io/welcome/releases/
- Kubernetes: Node Autoscaling - https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/
- Kubernetes: Version Skew Policy - https://kubernetes.io/releases/version-skew-policy/
- Kubernetes CLI: `kubectl get` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- AWS CLI: `update-auto-scaling-group` - https://docs.aws.amazon.com/cli/latest/reference/autoscaling/update-auto-scaling-group.html
- AWS: Configure EC2 Auto Scaling termination policies - https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-termination-policies.html
- AWS CLI: `describe-auto-scaling-groups` - https://docs.aws.amazon.com/cli/latest/reference/autoscaling/describe-auto-scaling-groups.html
- Terraform CLI: `-chdir` option - https://developer.hashicorp.com/terraform/cli/commands#switching-working-directory-with-chdir

## Issues Found
No technical issues found.

## Review Notes
- The kOps command syntax and flags were also checked directly against the official kOps v1.36.1 binary. In particular, `kops update cluster` supports `--instance-group`, defaults to dry-run mode without `--yes`, and accepts the cluster name positionally. The `get`, `edit`, and `validate` examples use valid current syntax.
- The current kOps API defines `InstanceGroupSpec.minSize`, `maxSize`, and `autoscale` as shown. The API notes that `autoscale` applies when Cluster Autoscaler is enabled.
- `--instance-group` limits which InstanceGroups kOps updates, but the dry run remains essential because `kops update cluster` can also calculate shared cluster resources. The post correctly instructs readers to reject previews containing cluster-wide or unrelated changes.
- AWS documents that raising `MinSize` above the current group size raises desired capacity to the new minimum, while lowering `MaxSize` below the current group size lowers desired capacity to the new maximum. AWS also uses its termination policy to select instances during scale-in, so the post's drain warning is correct.
- Karpenter-managed InstanceGroups have version-specific NodePool behavior in recent kOps releases. The post correctly separates that case from Cluster Autoscaler-managed ASGs rather than applying the fixed/ASG runbook to it.
- Terraform-target clusters must regenerate Terraform in the existing output directory and use `terraform plan` and `terraform apply`; they should not mix Terraform ownership with direct kOps cloud updates. The post follows the official workflow.
