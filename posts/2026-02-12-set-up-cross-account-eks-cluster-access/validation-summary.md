# Validation Summary: How to Set Up Cross-Account EKS Cluster Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS
- AWS IAM roles and trust policies
- AWS STS role assumption
- AWS CLI
- eksctl
- Kubernetes RBAC
- aws-auth ConfigMap
- EKS access entries
- GitHub Actions

## Sources Consulted
- Amazon EKS documentation: Create access entries - https://docs.aws.amazon.com/eks/latest/userguide/creating-access-entries.html
- Amazon EKS documentation: Change authentication mode to use access entries - https://docs.aws.amazon.com/eks/latest/userguide/setting-up-access-entries.html
- Amazon EKS API Reference: CreateAccessEntry - https://docs.aws.amazon.com/eks/latest/APIReference/API_CreateAccessEntry.html
- Amazon EKS API Reference: AssociateAccessPolicy - https://docs.aws.amazon.com/eks/latest/APIReference/API_AssociateAccessPolicy.html
- AWS CLI Command Reference: eks update-kubeconfig - https://docs.aws.amazon.com/cli/latest/reference/eks/update-kubeconfig.html
- Amazon EKS documentation: Grant IAM users access to Kubernetes with a ConfigMap - https://docs.aws.amazon.com/eks/latest/userguide/auth-configmap.html
- Amazon EKS best practices: Identity and Access Management - https://docs.aws.amazon.com/eks/latest/best-practices/identity-and-access-management.html
- eksctl documentation: Manage IAM users and roles - https://docs.aws.amazon.com/eks/latest/eksctl/iam-identity-mappings.html
- Kubernetes documentation: Using RBAC Authorization - https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes kubectl reference: kubectl auth whoami - https://kubernetes.io/docs/reference/kubectl/generated/
- AWS IAM documentation: The confused deputy problem - https://docs.aws.amazon.com/IAM/latest/UserGuide/confused-deputy.html
- aws-actions/configure-aws-credentials documentation - https://github.com/aws-actions/configure-aws-credentials

## Issues Found
- The IAM trust policy required `sts:ExternalId`, but the later `aws eks update-kubeconfig --role-arn` and kubeconfig `aws eks get-token --role-arn` flow did not provide an external ID. That would cause role assumption to fail. Removed the external ID condition from the first-party cross-account example and changed the text to recommend external IDs only when a third-party system is assuming the role and can pass the matching external ID.
- The post said the aws-auth versus access-entry choice depends on EKS version. Access entries depend on the cluster authentication mode and platform support, not just the Kubernetes/EKS version. Updated the wording and added the `aws eks update-cluster-config --access-config authenticationMode=API_AND_CONFIG_MAP` prerequisite command for clusters still using only the ConfigMap mode.
- The cross-account `aws eks update-kubeconfig` example used only `--role-arn`. Official AWS CLI documentation distinguishes `--assume-role-arn` for retrieving cluster details cross-account from `--role-arn` for kubectl authentication. Added `--assume-role-arn` to the command and clarified the difference.
- The GitHub Actions example used OIDC permissions while directly assuming the Account B role, which did not match the preceding Account A to Account B trust model. Updated the workflow to first configure credentials for an Account A role, then assume the Account B workload role with `role-chaining: true`.

## Review Notes
AWS CLI and kubectl were not installed in the local workspace, so CLI behavior was verified against official documentation rather than local `--help` output. The aws-auth ConfigMap method is now deprecated by AWS in favor of EKS access entries, but it remains technically valid for clusters using ConfigMap or API_AND_CONFIG_MAP authentication modes.
