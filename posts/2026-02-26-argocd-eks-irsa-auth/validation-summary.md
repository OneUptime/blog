# Validation Summary: How to Configure IAM/IRSA Auth for EKS Clusters in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD cluster secrets and `awsAuthConfig`
- Amazon EKS
- IAM Roles for Service Accounts (IRSA)
- AWS IAM roles and trust policies
- EKS access entries and legacy `aws-auth` ConfigMap mappings
- Kubernetes RBAC
- AWS CLI, kubectl, and eksctl

## Sources Consulted
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Amazon EKS IRSA service account role documentation: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- Amazon EKS cross-account IRSA documentation: https://docs.aws.amazon.com/eks/latest/userguide/cross-account-access.html
- Amazon EKS IAM best practices for IRSA trust scoping: https://docs.aws.amazon.com/eks/latest/best-practices/identity-and-access-management.html
- eksctl IAM service account documentation: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html
- Amazon EKS access entries documentation: https://docs.aws.amazon.com/eks/latest/userguide/access-entries.html
- Amazon EKS `aws-auth` ConfigMap documentation: https://docs.aws.amazon.com/eks/latest/userguide/auth-configmap.html
- AWS CLI `create-access-entry` command reference: https://docs.aws.amazon.com/cli/latest/reference/eks/create-access-entry.html

## Issues Found
- The post stated that most eksctl-created clusters have OIDC enabled by default. Updated this to say OIDC is not always enabled and should be checked first.
- The post used the Argo CD management IRSA role as the target cluster role in `aws-auth` and `awsAuthConfig`. Updated the examples to create and use a separate `ArgoCD-Target-Production` role that the management role assumes, matching Argo CD's documented EKS pattern.
- The post presented `aws-auth` as the primary target-cluster access method. Added EKS access entries as the preferred current method and kept `aws-auth` as the legacy fallback.
- The post omitted `argocd-applicationset-controller` from the service accounts that may need IRSA. Added its annotation and rollout restart command.
- The cross-account target role trust policy required `sts:ExternalId`, but Argo CD's `awsAuthConfig` does not expose an external ID field. Removed that condition so the example can work with `awsAuthConfig`.
- The verification commands addressed the application controller as a Deployment, but the default Argo CD application controller is a StatefulSet pod. Updated the exec examples to use `pod/argocd-application-controller-0`.
- The AWS CLI verification command assumed the AWS CLI is present in the Argo CD container. Clarified that the command only applies if the AWS CLI is available.

## Review Notes
The RBAC example intentionally grants broad cluster-admin-style Kubernetes permissions because Argo CD commonly needs to manage arbitrary workload resources. For production, the role should still be scoped to the namespaces and resources Argo CD actually manages where possible.
