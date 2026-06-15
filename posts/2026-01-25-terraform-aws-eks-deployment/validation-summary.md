# Validation Summary: How to Deploy AWS EKS with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS provider for Terraform
- Amazon EKS
- Kubernetes
- Amazon VPC
- IAM and IRSA
- Helm
- AWS CLI
- AWS Load Balancer Controller
- Metrics Server

## Sources Consulted
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Amazon EKS optimized AMI documentation: https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html
- Amazon Linux 2 EKS AMI deprecation FAQ: https://docs.aws.amazon.com/eks/latest/userguide/eks-ami-deprecation-faqs.html
- AWS CLI `eks get-token` command reference: https://docs.aws.amazon.com/cli/latest/reference/eks/get-token.html
- AWS CLI `eks update-kubeconfig` command reference: https://docs.aws.amazon.com/cli/latest/reference/eks/update-kubeconfig.html
- Amazon EKS managed node taints documentation: https://docs.aws.amazon.com/eks/latest/userguide/node-taints-managed-node-groups.html
- AWS Load Balancer Controller Helm installation guide: https://docs.aws.amazon.com/eks/latest/userguide/lbc-helm.html
- Terraform AWS provider `aws_eks_node_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_node_group
- Terraform AWS EKS module documentation: https://registry.terraform.io/modules/terraform-aws-modules/eks/aws/19.21.0
- Terraform AWS VPC module documentation: https://registry.terraform.io/modules/terraform-aws-modules/vpc/aws/5.1.0
- Terraform AWS IAM IRSA module documentation: https://registry.terraform.io/modules/terraform-aws-modules/iam/aws/5.30.0/submodules/iam-role-for-service-accounts-eks
- Terraform AWS EKS module issue documenting the VPC CNI IRSA dependency cycle pattern: https://github.com/terraform-aws-modules/terraform-aws-eks/issues/2557

## Issues Found
- The default Kubernetes version was `1.28`, which is no longer available for new Amazon EKS clusters as of the review date. Changed it to `1.33`, a currently supported standard-support EKS version on June 15, 2026.
- The managed node group used `ami_type = "AL2_x86_64"`. Amazon EKS no longer publishes EKS-optimized Amazon Linux 2 AMIs for newer Kubernetes versions such as 1.33, so this was changed to `AL2023_x86_64_STANDARD`.
- The Terraform snippets referenced `var.allowed_cidrs`, `var.enable_fargate`, and `var.hosted_zone_arns` without declaring those variables. Added the missing variable declarations.
- The VPC CNI IRSA example passed `module.vpc_cni_irsa.iam_role_arn` into `module.eks.cluster_addons` while `module.vpc_cni_irsa` depended on `module.eks.oidc_provider_arn`, creating a Terraform dependency cycle. Removed the VPC CNI IRSA module and its `service_account_role_arn` reference from the add-on example; the node role CNI policy shown in the IAM section supports this configuration.
- The VPC section described `terraform-aws-modules/vpc/aws` as an "official AWS module." This module is a community Terraform AWS module, so the wording was corrected.

## Review Notes
- Terraform CLI is not installed in the local environment, so I could not run `terraform fmt` or `terraform validate`. The snippets were reviewed manually against the official provider and module documentation.
- The article still uses the older `terraform-aws-modules/eks/aws` v19 module line. It is valid for the pattern shown, but future maintenance should consider updating to the latest major version because module inputs have changed in newer releases.
- The AWS Load Balancer Controller Helm command creates the service account through the chart and annotates it with the Terraform-created IRSA role. AWS's own guide often shows creating the service account before Helm and using `serviceAccount.create=false`; both patterns are valid when the service account annotation and trust policy match.
