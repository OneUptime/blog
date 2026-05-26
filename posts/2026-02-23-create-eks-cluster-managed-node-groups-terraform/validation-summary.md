# Validation Summary: How to Create EKS Cluster with Managed Node Groups in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- Amazon EKS
- EKS managed node groups
- Amazon EC2 launch templates
- Amazon Linux 2023 EKS-optimized AMIs
- Kubernetes Cluster Autoscaler
- AWS Load Balancer Controller subnet tags
- AWS IAM

## Sources Consulted
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Amazon EKS managed node groups: https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html
- Amazon EKS launch templates for managed nodes: https://docs.aws.amazon.com/eks/latest/userguide/launch-templates.html
- Amazon EKS AL2023 migration notes: https://docs.aws.amazon.com/eks/latest/userguide/al2023.html
- Amazon EKS recommended AMI SSM parameters: https://docs.aws.amazon.com/eks/latest/userguide/retrieve-ami-id.html
- Amazon EKS AMI nodeadm documentation: https://awslabs.github.io/amazon-eks-ami/nodeadm/
- Terraform AWS provider `aws_eks_cluster` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_cluster
- Terraform AWS provider `aws_eks_node_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_node_group
- Terraform AWS provider `aws_launch_template` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- AWS Load Balancer Controller subnet discovery: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/deploy/subnet_discovery/
- Cluster Autoscaler AWS cloud provider documentation: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/aws/README.md

## Issues Found
- The post used EKS Kubernetes version `1.29`, which is no longer available in EKS standard or extended support as of May 26, 2026. Updated the cluster version and matching AMI lookup to `1.33`, which is in standard support.
- The custom launch template used an Amazon Linux 2 SSM AMI path and a `/etc/eks/bootstrap.sh` user data script. Amazon EKS stopped publishing AL2 optimized AMIs on November 26, 2025, and current supported EKS versions should use AL2023 or Bottlerocket. Updated the SSM path to the AL2023 EKS-optimized AMI path and replaced the bootstrap script with AL2023 `nodeadm` MIME user data.
- The update guidance claimed EKS might drain all nodes at once without `max_unavailable`. Reworded it to accurately state that `update_config` controls how many nodes EKS can update in parallel.
- The Cluster Autoscaler tagging guidance referred to "autoscaler annotations." Reworded it to describe Auto Scaling group discovery tags and scale-from-zero label/taint discovery requirements.

## Review Notes
The autoscaler IAM example attaches permissions to the node IAM role, which can work, but IRSA is the recommended production pattern for the Cluster Autoscaler service account. The post already links to a separate IRSA guide, so this was left as a caveat rather than expanding the tutorial.
