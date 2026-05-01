# Validation Summary: How to Design a Kubernetes Cluster Module for OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- Amazon EKS
- AWS IAM
- Kubernetes
- AWS CLI

## Sources Consulted
- OpenTofu Configuration Syntax: https://opentofu.org/docs/v1.9/language/syntax/configuration/
- HCL Native Syntax Specification: https://raw.githubusercontent.com/hashicorp/hcl/refs/heads/main/hclsyntax/spec.md
- Amazon EKS cluster IAM role: https://docs.aws.amazon.com/eks/latest/userguide/cluster-iam-role.html
- Amazon EKS node IAM role: https://docs.aws.amazon.com/eks/latest/userguide/create-node-role.html
- Create an IAM OIDC provider for your cluster: https://docs.aws.amazon.com/eks/latest/userguide/enable-iam-roles-for-service-accounts.html
- Understand the Kubernetes version lifecycle on EKS: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Create nodes with optimized Amazon Linux AMIs: https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html
- Simplify node lifecycle with managed node groups: https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html
- AWS CLI `eks create-nodegroup`: https://docs.aws.amazon.com/cli/latest/reference/eks/create-nodegroup.html

## Issues Found
- The post used several one-line OpenTofu/HCL blocks with multiple arguments separated by semicolons. That syntax is invalid in HCL native syntax, so I converted those variables to standard multi-line blocks.
- The default EKS cluster version was `1.29`. As of 2026-05-01, Amazon EKS lists `1.35`, `1.34`, and `1.33` in standard support and `1.32`, `1.31`, and `1.30` in extended support, so `1.29` is no longer creatable for new clusters. I updated the default to `1.35`.
- The node IAM role attached `AmazonEC2ContainerRegistryReadOnly`, but current Amazon EKS node role guidance uses `AmazonEC2ContainerRegistryPullOnly`. I updated the policy ARN accordingly.
- The description and body text claimed IRSA support and add-on management, but the code only exported the cluster OIDC issuer and did not create an IAM OIDC provider, IRSA roles, or add-ons. I corrected the wording so it matches the implemented code.
- The conclusion used GPU node groups as an example, but the module as shown does not expose `ami_type`, and AWS documents that GPU instance types need a matching GPU AMI type. I removed the GPU example from the conclusion.

## Review Notes
- `cluster_endpoint_public_access = true` with `cluster_endpoint_public_access_cidrs = ["0.0.0.0/0"]` is valid, but it is a weak default for most production clusters. A future revision should either document that tradeoff clearly or tighten the default.
- If the post is later expanded to cover real IRSA support, it should add the IAM OIDC provider and service-account role resources rather than only exporting the issuer URL.
