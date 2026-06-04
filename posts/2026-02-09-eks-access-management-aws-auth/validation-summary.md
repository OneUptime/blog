# Validation Summary: How to Set Up EKS Cluster Access Management with aws-auth ConfigMap Migration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS
- Kubernetes RBAC
- AWS IAM
- aws-auth ConfigMap
- EKS access entries and access policies
- AWS CLI
- Terraform AWS provider
- AWS CloudTrail
- Amazon CloudWatch Logs

## Sources Consulted
- Amazon EKS User Guide: Grant IAM users access to Kubernetes with EKS access entries - https://docs.aws.amazon.com/eks/latest/userguide/access-entries.html
- Amazon EKS User Guide: Change authentication mode to use access entries - https://docs.aws.amazon.com/eks/latest/userguide/setting-up-access-entries.html
- Amazon EKS User Guide: Migrating existing aws-auth ConfigMap entries to access entries - https://docs.aws.amazon.com/eks/latest/userguide/migrating-access-entries.html
- Amazon EKS User Guide: Create access entries - https://docs.aws.amazon.com/eks/latest/userguide/creating-access-entries.html
- Amazon EKS User Guide: Associate access policies with access entries - https://docs.aws.amazon.com/eks/latest/userguide/access-policies.html
- Amazon EKS User Guide: Review access policy permissions - https://docs.aws.amazon.com/eks/latest/userguide/access-policy-permissions.html
- Amazon EKS User Guide: Grant IAM users access to Kubernetes with a ConfigMap - https://docs.aws.amazon.com/eks/latest/userguide/auth-configmap.html
- Amazon EKS User Guide: Send control plane logs to CloudWatch Logs - https://docs.aws.amazon.com/eks/latest/userguide/control-plane-logs.html
- AWS CLI Command Reference: eks create-access-entry - https://docs.aws.amazon.com/cli/latest/reference/eks/create-access-entry.html
- AWS CLI Command Reference: eks associate-access-policy - https://docs.aws.amazon.com/cli/latest/reference/eks/associate-access-policy.html
- AWS CLI Command Reference: eks update-cluster-config - https://docs.aws.amazon.com/cli/latest/reference/eks/update-cluster-config.html
- AWS CLI Command Reference: eks update-kubeconfig - https://docs.aws.amazon.com/cli/latest/reference/eks/update-kubeconfig.html
- Terraform AWS Provider: aws_eks_access_entry - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_access_entry
- Terraform AWS Provider: aws_eks_access_policy_association - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_access_policy_association

## Issues Found
- The post did not include the required step to enable an EKS authentication mode that supports access entries. Added an `aws eks update-cluster-config --access-config authenticationMode=API_AND_CONFIG_MAP` command before creating access entries.
- The post described all node IAM roles as needing manually created `EC2_LINUX` access entries. Clarified that this applies to Linux and Bottlerocket self-managed nodes, while EKS creates entries for managed node groups and Fargate profiles when access entries are enabled.
- The post claimed `EC2_LINUX` explicitly configures both `system:nodes` and `system:bootstrappers` groups. Reworded this to avoid over-specifying implementation details and align with AWS documentation that EKS grants the necessary node permissions for non-STANDARD access entries.
- The testing example ran `aws sts assume-role` but did not use the returned temporary credentials. Replaced it with `aws eks update-kubeconfig --role-arn`, which the AWS CLI documents for kubectl authentication with a role.
- The removal section claimed EKS automatically falls back to access entries when the ConfigMap is absent and that restoring the ConfigMap is a simple rollback. Corrected it to explain the one-way transition from `CONFIG_MAP` to `API_AND_CONFIG_MAP` to `API`, and to recommend staying in `API_AND_CONFIG_MAP` for a reversible migration window.
- The monitoring section suggested using CloudTrail `AssumeRoleWithWebIdentity` lookups for cluster authentication attempts. Replaced this with CloudTrail lookups for access-entry management events and an EKS authenticator control plane logging command for Kubernetes API authentication events.

## Review Notes
The AWS CLI commands and Terraform resource snippets are otherwise consistent with current official documentation. The post remains version-sensitive because EKS access-entry types and managed access policies continue to evolve; future reviews should re-check the list of access entry types and managed access policies.
