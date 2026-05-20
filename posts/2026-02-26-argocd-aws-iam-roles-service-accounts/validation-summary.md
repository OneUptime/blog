# Validation Summary: How to Configure ArgoCD with AWS IAM Roles for Service Accounts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD Image Updater
- Kubernetes
- Amazon EKS
- AWS IAM Roles for Service Accounts (IRSA)
- AWS STS
- Amazon ECR
- Amazon S3
- AWS Secrets Manager
- AWS Systems Manager Parameter Store
- External Secrets Operator

## Sources Consulted
- Amazon EKS: IAM Roles for Service Accounts / eksctl iamserviceaccounts documentation: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html
- Amazon EKS best practices: Identity and Access Management, including IRSA environment variables: https://docs.aws.amazon.com/eks/latest/best-practices/identity-and-access-management.html
- Amazon EKS: Configure Pods to use a Kubernetes service account: https://docs.aws.amazon.com/eks/latest/userguide/pod-configuration.html
- Argo CD declarative setup documentation, EKS cluster secret and IRSA examples: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/declarative-setup/
- Argo CD Image Updater authentication documentation: https://argocd-image-updater.readthedocs.io/en/stable/basics/authentication/
- Argo CD Image Updater registry configuration documentation: https://argocd-image-updater.readthedocs.io/en/stable/configuration/registries/
- External Secrets Operator AWS authentication documentation: https://external-secrets.io/latest/provider/aws-access/
- Amazon EKS access entries documentation: https://docs.aws.amazon.com/eks/latest/userguide/access-entries.html
- Amazon EKS access policy association documentation: https://docs.aws.amazon.com/eks/latest/userguide/access-policies.html
- Amazon EKS aws-auth ConfigMap documentation: https://docs.aws.amazon.com/eks/latest/userguide/auth-configmap.html

## Issues Found
- The IRSA flow incorrectly implied that temporary AWS credentials themselves are injected as environment variables. Updated it to explain that EKS injects `AWS_ROLE_ARN` and `AWS_WEB_IDENTITY_TOKEN_FILE`, which AWS SDKs and the AWS CLI use to obtain temporary credentials.
- The opening description implied Argo CD directly pulls workload images from ECR and directly uses Secrets Manager for credentials. Updated the wording to distinguish ECR-hosted Helm charts, image metadata used by Image Updater, and Secrets Manager access through tools such as External Secrets Operator.
- The trust policy example was labeled as YAML and described as a declarative service account example even though it was JSON IAM policy content. Updated the surrounding text and code fence.
- The Argo CD server section overstated that the server needs AWS access for Cognito SSO or webhooks. Updated it to clarify that AWS access is only needed for custom integrations that call AWS APIs.
- The Argo CD Image Updater service account name was updated to the current default installation service account, `argocd-image-updater-controller`, from the official Image Updater documentation.
- The cross-account EKS access section used an IAM permission policy where current EKS and Argo CD docs recommend EKS access entries for Kubernetes API authorization. Replaced that snippet with `aws eks create-access-entry` and `aws eks associate-access-policy`, and marked `aws-auth` as deprecated.
- The Argo CD cluster secret example omitted `tlsClientConfig`, which the official Argo CD EKS declarative setup example includes. Added `tlsClientConfig` with `caData`.
- The troubleshooting section suggested checking for an EKS pod identity webhook pod in `kube-system`, which is not a reliable IRSA check on EKS. Replaced it with checking that the running pod was mutated with the expected IRSA environment variables.

## Review Notes
The examples remain illustrative and use placeholder account IDs, cluster names, role names, and certificate data. The `system:masters` group in the deprecated `aws-auth` fallback works but is broad; a production setup should prefer least-privilege EKS access policies or Kubernetes RBAC bindings.
