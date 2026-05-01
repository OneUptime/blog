# Validation Summary: How to Create EKS Node Groups with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / HCL
- AWS EKS
- AWS IAM
- AWS CLI
- Kubernetes
- Amazon EC2 Launch Templates

## Sources Consulted
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- EKS AL2 AMI deprecation FAQ: https://docs.aws.amazon.com/eks/latest/userguide/eks-ami-deprecation-faqs.html
- Amazon EKS managed node groups: https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html
- Amazon EKS launch templates for managed nodes: https://docs.aws.amazon.com/eks/latest/userguide/launch-templates.html
- Amazon EKS node IAM role: https://docs.aws.amazon.com/eks/latest/userguide/create-node-role.html
- Amazon EKS cluster endpoint access: https://docs.aws.amazon.com/eks/latest/userguide/cluster-endpoint.html
- Connect kubectl to an EKS cluster: https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html
- AWS CLI `create-nodegroup` reference: https://docs.aws.amazon.com/cli/latest/reference/eks/create-nodegroup.html
- AWS provider `aws_eks_cluster` docs source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/eks_cluster.html.markdown
- AWS provider `aws_eks_node_group` docs source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/eks_node_group.html.markdown
- Amazon EKS Karpenter best practices: https://docs.aws.amazon.com/eks/latest/best-practices/karpenter.html
- Karpenter documentation: https://karpenter.sh/docs/

## Issues Found
- The cluster example pinned Kubernetes `1.29`, which is no longer a supported Amazon EKS version as of May 1, 2026. I updated it to `1.35`.
- The basic node group example used `ami_type = "AL2_x86_64"`. Amazon EKS stopped publishing AL2-optimized AMIs after November 26, 2025, and Kubernetes `1.32` was the last EKS version to support AL2 AMIs. I updated it to `AL2023_x86_64_STANDARD`.
- The node IAM role attached `AmazonEC2ContainerRegistryReadOnly`. Current EKS node role guidance uses `AmazonEC2ContainerRegistryPullOnly` for pulling images from Amazon ECR. I updated the policy ARN.
- The Spot node group used `node.kubernetes.io/lifecycle=spot` as its example label. Amazon EKS already applies `eks.amazonaws.com/capacityType: SPOT`; the original key was not the documented EKS capacity label. I replaced it with a neutral custom label (`capacity = "spot"`).
- The best-practices section said “cluster autoscaler or Karpenter” can manage `desired_size`. Cluster Autoscaler can scale managed node groups; Karpenter is a separate node provisioning model based on NodePools and NodeClasses. I updated the wording to refer only to Cluster Autoscaler for `desired_size`.
- The best-practices section implied public access is needed for the control plane. I updated the wording to recommend private node subnets and restricting public API endpoint access where possible, which matches current EKS endpoint guidance.

## Review Notes
- The cluster example still uses `public_access_cidrs = ["0.0.0.0/0"]` for simplicity. This is valid, but production deployments should restrict it to trusted admin CIDRs or disable public endpoint access when possible.
- The Spot example uses mixed instance sizes (`t3.medium`, `t3.large`, `t3a.medium`). This works, but using similar-capacity instance types is usually easier for workload scheduling and Cluster Autoscaler behavior.
- `tofu` and `terraform` were not installed in the review environment, so validation was documentation-based rather than CLI schema-based.
