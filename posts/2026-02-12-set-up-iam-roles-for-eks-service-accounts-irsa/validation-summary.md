# Validation Summary: How to Set Up IAM Roles for EKS Service Accounts (IRSA)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS
- IAM Roles for Service Accounts (IRSA)
- AWS IAM OIDC identity providers
- AWS STS AssumeRoleWithWebIdentity
- Kubernetes service accounts and pods
- eksctl
- AWS CLI
- kubectl
- Amazon S3 IAM policies

## Sources Consulted
- Amazon EKS User Guide: IAM roles for service accounts: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- Amazon EKS User Guide: Create an IAM OIDC provider for your cluster: https://docs.aws.amazon.com/eks/latest/userguide/enable-iam-roles-for-service-accounts.html
- Amazon EKS User Guide: Assign IAM roles to Kubernetes service accounts: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- eksctl User Guide: IAM Roles for Service Accounts: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html
- AWS CLI Command Reference: iam create-open-id-connect-provider: https://docs.aws.amazon.com/cli/latest/reference/iam/create-open-id-connect-provider.html
- Kubernetes kubectl reference: kubectl run: https://v1-35.docs.kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl reference: kubectl annotate: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/

## Issues Found
- The IRSA mechanism description said the webhook injects AWS credentials. I changed this to say the webhook injects the role ARN and token file path as environment variables and mounts the projected service account token. The AWS SDK or CLI then uses that token to call STS and obtain temporary credentials.
- The manual OIDC provider example computed a certificate fingerprint with `openssl` and passed it as `--thumbprint-list`. IAM expects OIDC thumbprints for the relevant certificate authority chain, and the current AWS CLI documentation makes `--thumbprint-list` optional because IAM can retrieve the top intermediate CA thumbprint. I removed the ad hoc thumbprint command and omitted `--thumbprint-list` from the example.
- The temporary test pod command did not set `--restart=Never`. I added it so `kubectl run` creates a one-shot pod suitable for `--rm -it` verification with the AWS CLI image.

## Review Notes
- The post remains technically accurate for current EKS IRSA usage. AWS also offers EKS Pod Identity as a newer workload identity option, but IRSA is still documented and supported.
- The custom S3 policy example is acceptable for illustrating tight permissions, though separating bucket-level `s3:ListBucket` and object-level `s3:GetObject` into different statements would be clearer in a future editorial pass.
