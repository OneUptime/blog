# Validation Summary: How to Implement AWS EKS Managed Node Groups

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon EKS managed node groups
- eksctl
- Terraform AWS, Kubernetes, and Helm providers
- terraform-aws-modules EKS, VPC, IAM, and Karpenter modules
- EC2 launch templates and custom AMIs
- Packer
- Kubernetes scheduling, taints, tolerations, and node affinity
- Cluster Autoscaler
- Karpenter NodePools and EC2NodeClasses
- EC2 Spot Instances
- AWS Node Termination Handler
- CloudWatch Container Insights and Amazon CloudWatch Observability EKS add-on

## Sources Consulted
- Amazon EKS managed node group launch template documentation: https://docs.aws.amazon.com/eks/latest/userguide/launch-templates.html
- Amazon EKS managed node group creation documentation: https://docs.aws.amazon.com/eks/latest/userguide/create-managed-node-group.html
- Amazon EKS Kubernetes version lifecycle documentation: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- eksctl Spot instances documentation: https://docs.aws.amazon.com/eks/latest/eksctl/spot-instances.html
- Amazon EKS API Nodegroup reference: https://docs.aws.amazon.com/eks/latest/APIReference/API_Nodegroup.html
- Karpenter NodePool documentation: https://karpenter.sh/docs/concepts/nodepools/
- Karpenter EC2NodeClass documentation: https://karpenter.sh/docs/concepts/nodeclasses/
- Karpenter v1beta1 migration documentation: https://karpenter.sh/v1.0/upgrading/v1beta1-migration/
- Karpenter upgrade guide: https://karpenter.sh/docs/upgrading/upgrade-guide/
- Helm install documentation: https://helm.sh/docs/helm/helm_install/
- Kubernetes taints and tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- HashiCorp Packer Amazon EBS builder documentation: https://developer.hashicorp.com/packer/integrations/hashicorp/amazon/latest/components/builder/ebs
- Amazon CloudWatch Observability EKS add-on documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-setup-EKS-addon.html

## Issues Found
- The examples used Kubernetes `1.29`, which is no longer available in Amazon EKS support as of June 12, 2026. Updated examples to `1.32`, which is still available in EKS extended support and remains compatible with the Amazon Linux 2 examples used in the post.
- The Terraform configuration used `helm_release` without declaring the Helm provider. Added the `hashicorp/helm` provider to `required_providers`.
- The Terraform `cluster_addons` map used unquoted keys containing hyphens (`kube-proxy` and `vpc-cni`). Quoted those keys so the HCL parses correctly.
- The Karpenter NodePool selected subnets and security groups by `karpenter.sh/discovery`, but the earlier VPC and EKS module snippets did not add those tags. Added the required private subnet and node security group tags.
- The launch template user data specified an AMI ID but did not bootstrap the node into the cluster. Added `/etc/eks/bootstrap.sh` because EKS does not merge managed bootstrap user data when an AMI ID is specified in the launch template.
- The launch template user data appended a complete JSON object to `kubelet-config.json`, which would produce invalid JSON. Replaced it with a `jq` update that modifies the existing kubelet config file.
- The Karpenter example pinned `v0.33.0` and used `v1beta1` resources. Updated the manifest examples to current `v1` NodePool and EC2NodeClass APIs and removed the obsolete chart pin.
- The Karpenter `v1beta1` example set `consolidateAfter` with `WhenUnderutilized`, a combination documented as invalid for that API version. Updated the example to current `WhenEmptyOrUnderutilized`.
- The eksctl managed Spot node group example included an unsupported `spot.allocationStrategy` block. Removed it and clarified that EKS managed node groups use capacity-optimized Spot allocation.
- The CloudWatch Observability add-on command pinned an old add-on version. Removed the pin so EKS can select a compatible current/default add-on version.
- The Node Termination Handler section implied it was required for managed Spot node groups. Reworded it as optional for additional interruption event handling.

## Review Notes
The article remains technically valid as an EKS managed node group tutorial. The examples intentionally stay on EKS `1.32` because the post uses Amazon Linux 2 AMI paths and `bootstrap.sh`; future updates that move the tutorial to EKS `1.33` or later should also migrate the AMI examples to Amazon Linux 2023 and `nodeadm` user data.
