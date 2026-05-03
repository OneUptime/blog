# Validation Summary: How to Deploy an EKS Cluster with OpenTofu

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- OpenTofu (Terraform-compatible)
- HashiCorp Configuration Language (HCL)
- AWS Elastic Kubernetes Service (EKS)
- AWS IAM (roles, policy attachments, OIDC provider)
- Kubernetes (managed node groups, core add-ons: CoreDNS, VPC CNI, kube-proxy)
- AWS KMS (envelope encryption for Kubernetes secrets)
- IAM Roles for Service Accounts (IRSA)
- TLS provider (`tls_certificate` data source)

## Sources Consulted
- AWS Terraform provider — `aws_eks_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_cluster
- AWS Terraform provider — `aws_eks_node_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_node_group
- AWS Terraform provider — `aws_eks_addon`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_addon
- AWS Terraform provider — `aws_iam_openid_connect_provider`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_openid_connect_provider
- TLS provider — `tls_certificate` data source: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/data-sources/certificate
- AWS EKS service IAM role documentation: https://docs.aws.amazon.com/eks/latest/userguide/service_IAM_role.html
- AWS EKS worker node IAM role documentation: https://docs.aws.amazon.com/eks/latest/userguide/create-node-role.html
- AWS EKS control plane logging types: https://docs.aws.amazon.com/eks/latest/userguide/control-plane-logs.html
- AWS EKS IRSA documentation: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html

## Issues Found
No technical issues found.

All managed-policy ARNs (`AmazonEKSClusterPolicy`, `AmazonEKSWorkerNodePolicy`, `AmazonEKS_CNI_Policy`, `AmazonEC2ContainerRegistryReadOnly`) are correct. The trust principals (`eks.amazonaws.com` for the control plane role, `ec2.amazonaws.com` for the node role) are correct. All `aws_eks_cluster` arguments and nested blocks (`vpc_config`, `encryption_config`, `enabled_cluster_log_types`) match the provider schema, and the five log types listed are all valid. `aws_eks_node_group` arguments (`scaling_config`, `update_config`, `labels`) are valid. `aws_eks_addon`'s `resolve_conflicts_on_update = "OVERWRITE"` is a valid enum value. The `tls_certificate` → `sha1_fingerprint` chain and `aws_iam_openid_connect_provider` configuration are correct for IRSA setup. The `aws_eks_cluster.main.identity[0].oidc[0].issuer` reference is the documented way to obtain the OIDC issuer URL.

## Review Notes
- Since AWS now automatically manages OIDC provider thumbprints (announced 2023), the `thumbprint_list` derived from `tls_certificate` is still accepted but is effectively informational; it remains the conventional pattern.
- The `depends_on` on the cluster's policy attachment, and on the node-role policy attachments for the node group, is the recommended pattern to avoid race conditions during `apply`.
- `resolve_conflicts_on_update` is only set on the CoreDNS add-on; for `vpc-cni` and `kube-proxy` it defaults to `NONE`, which is fine for first-time creation but may cause future updates to fail if the add-ons are modified out-of-band. This is a stylistic choice rather than a bug.
- The post does not pin a `kubernetes_version` or AWS provider version; in production OpenTofu code, pinning both via `required_providers` and `var.kubernetes_version` defaults is recommended, but this is a stylistic concern outside the scope of technical correctness.
- When `endpoint_public_access` is `false`, the conditional `public_access_cidrs = var.public_endpoint ? var.allowed_cidrs : null` correctly avoids the AWS API rejection that occurs when CIDRs are supplied without public access enabled.
