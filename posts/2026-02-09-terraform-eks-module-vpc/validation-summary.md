# Validation Summary: Using Terraform Modules to Deploy EKS Clusters with Custom VPC Configurations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Amazon EKS
- Amazon VPC
- AWS Load Balancer Controller
- Amazon VPC CNI
- IAM Roles for Service Accounts (IRSA)
- AWS CLI
- Kubernetes

## Sources Consulted
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Amazon EKS ALB subnet tagging documentation: https://docs.aws.amazon.com/eks/latest/userguide/alb-ingress.html
- Amazon EKS VPC CNI best practices: https://docs.aws.amazon.com/eks/latest/best-practices/vpc-cni.html
- Amazon EKS prefix delegation documentation: https://docs.aws.amazon.com/eks/latest/userguide/cni-increase-ip-addresses.html
- AWS CLI `eks update-kubeconfig` command reference: https://docs.aws.amazon.com/cli/latest/reference/eks/update-kubeconfig.html
- HashiCorp AWS provider `aws_vpc_security_group_egress_rule` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/vpc_security_group_egress_rule.html.markdown
- `terraform-aws-modules/vpc/aws` v5.5.0 variables and outputs: https://github.com/terraform-aws-modules/terraform-aws-vpc/tree/v5.5.0
- `terraform-aws-modules/eks/aws` v20.8.0 variables and outputs: https://github.com/terraform-aws-modules/terraform-aws-eks/tree/v20.8.0
- `terraform-aws-modules/iam/aws` v5.37.0 IRSA submodule variables: https://github.com/terraform-aws-modules/terraform-aws-iam/tree/v5.37.0/modules/iam-role-for-service-accounts-eks

## Issues Found
- The EKS cluster version was set to `1.29`, which is no longer listed as available in Amazon EKS standard or extended support as of 2026-06-03. Updated the default and example `cluster_version` to `1.35`, which is currently in standard support.
- The `/19` subnet size explanation said each subnet provides 8,190 IP addresses. A `/19` contains 8,192 total addresses, and AWS reserves five addresses per subnet, leaving 8,187 usable addresses. Updated the explanation.
- The security group section said EKS creates both the cluster and node security groups automatically. Clarified that the EKS service creates the primary cluster security group and the Terraform module creates additional cluster and node security groups by default.
- The RDS egress example targeted `module.eks.cluster_security_group_id`, which is not the right security group for worker node and pod egress to RDS. Added the `node_security_group_id` output and updated the example to use `module.eks.node_security_group_id`.
- The RDS egress example used the older `aws_security_group_rule` resource. Updated it to `aws_vpc_security_group_egress_rule`, which the HashiCorp AWS provider documentation identifies as the current best practice for new security group rules.

## Review Notes
The Terraform module inputs and outputs used by the VPC, EKS, and IRSA examples match the pinned module versions checked during validation. The AWS Load Balancer Controller subnet tags, VPC CNI prefix delegation settings, max-pod discussion for `m6i.xlarge`, and `aws eks update-kubeconfig --region us-west-2 --name production` command are consistent with the consulted official documentation. The pinned Terraform module versions are older than the latest major releases, but they remain valid for the examples reviewed.
