# Validation Summary: How to Build a Container Platform with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS EKS
- Kubernetes
- AWS VPC networking
- EKS managed node groups
- Amazon EKS add-ons
- IAM Roles for Service Accounts (IRSA)
- Helm
- AWS Load Balancer Controller
- Cluster Autoscaler
- Amazon EBS CSI Driver

## Sources Consulted
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Amazon EKS VPC and subnet requirements: https://docs.aws.amazon.com/eks/latest/userguide/network-reqs.html
- Amazon EKS add-ons documentation: https://docs.aws.amazon.com/eks/latest/userguide/eks-add-ons.html
- Amazon EKS managed node group documentation: https://docs.aws.amazon.com/eks/latest/userguide/create-managed-node-group.html
- Amazon EKS OIDC provider / IRSA documentation: https://docs.aws.amazon.com/eks/latest/userguide/enable-iam-roles-for-service-accounts.html
- AWS Load Balancer Controller Helm installation for EKS: https://docs.aws.amazon.com/eks/latest/userguide/lbc-helm.html
- Terraform AWS provider `aws_eks_addon` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_addon
- Terraform AWS provider `aws_eks_node_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_node_group

## Issues Found
- The post used EKS Kubernetes version `1.29`, which reached the end of extended support on March 23, 2026 and can no longer be used for new EKS clusters. Updated the cluster version to `1.35`, which is in standard EKS support as of the validation date.
- The add-on examples pinned old versions tied to Kubernetes `1.29`. Removed the explicit `addon_version` arguments so EKS can select compatible default versions for the cluster version.
- The architecture list said the platform included the EFS CSI driver, but the Terraform example configured `aws-ebs-csi-driver`. Updated the architecture list to EBS CSI driver to match the implementation.
- The VPC section stated that EKS requires the shown subnet tags for auto-discovery. Current EKS documentation says the role tags are required when deploying load balancers to subnets, while the older cluster tag is no longer required by current AWS Load Balancer Controller versions. Updated the wording to describe Kubernetes load balancer subnet discovery instead of EKS cluster requirements.
- The AWS Load Balancer Controller Helm chart version was pinned to `1.7.1`, which is outdated. Updated the example to `1.14.0`, matching the current Amazon EKS Helm installation documentation.
- Added a caveat that EKS managed node group tags do not propagate to underlying Auto Scaling groups, so Cluster Autoscaler discovery tags must be verified on the ASGs when installing Cluster Autoscaler.

## Review Notes
The snippets are still partial examples and reference resources not defined in the post, such as IAM roles for CSI drivers and the load balancer controller, security groups, KMS keys, and EKS auth data sources. That is acceptable for a conceptual guide, but a future end-to-end version should include complete Terraform for IRSA trust policies, controller IAM policies, and Cluster Autoscaler deployment.
