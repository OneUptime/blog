# Validation Summary: How to Add an EKS Cluster to ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Amazon EKS
- AWS IAM
- IAM Roles for Service Accounts (IRSA)
- EKS access entries
- Kubernetes RBAC
- `aws-auth` ConfigMap
- AWS CLI
- `kubectl`

## Sources Consulted
- Argo CD Declarative Setup: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD `argocd cluster add` command reference: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/commands/argocd_cluster_add/
- Amazon EKS access entries documentation: https://docs.aws.amazon.com/eks/latest/userguide/access-entries.html
- Amazon EKS access entry setup documentation: https://docs.aws.amazon.com/eks/latest/userguide/setting-up-access-entries.html
- Amazon EKS `aws-auth` ConfigMap documentation: https://docs.aws.amazon.com/eks/latest/userguide/auth-configmap.html
- Amazon EKS IRSA service account role documentation: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html

## Issues Found
- The IRSA production flow used one IAM role for both the ArgoCD management role and the EKS target cluster role. Argo CD's current EKS documentation uses a management role for the ArgoCD service accounts and a separate per-cluster role in `awsAuthConfig.roleARN`. Updated the IAM policy, trust policy, target role, cluster secret, and explanation to reflect that role chain.
- The post mapped the ArgoCD management role directly into the target EKS cluster. Updated the examples to authorize the target cluster role instead.
- The post used `aws-auth` as the primary production authorization mechanism. AWS now marks `aws-auth` as deprecated and recommends EKS access entries. Added access entry commands and kept `aws-auth` as the fallback path.
- The post annotated only `argocd-application-controller`. Argo CD's EKS documentation lists `argocd-application-controller`, `argocd-applicationset-controller`, and `argocd-server` for the management role. Updated the trust policy and annotation commands accordingly.
- The cross-account section created the remote role but did not mention that the source management role needs `sts:AssumeRole` permission and that the target cluster must authorize the remote role. Added that requirement.
- The introduction said the three methods included a declarative approach, but the third method is cross-account access. Updated the wording.

## Review Notes
The least-privilege RBAC example is intentionally illustrative and still broad for many production environments. The post now calls out the AWS-managed `AmazonEKSClusterAdminPolicy` path for access entries, which is convenient but should be replaced with narrower access policies or Kubernetes groups for stricter production deployments.
