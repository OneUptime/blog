# Validation Summary: How to Implement AWS EKS IRSA

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon EKS
- IAM Roles for Service Accounts (IRSA)
- AWS IAM and STS
- OpenID Connect (OIDC)
- Kubernetes service accounts, Pods, Deployments, and NetworkPolicy
- eksctl
- AWS CLI
- AWS SDKs for Python, JavaScript, Go, and Java

## Sources Consulted
- Amazon EKS: IAM roles for service accounts: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- Amazon EKS: Create an IAM OIDC provider for your cluster: https://docs.aws.amazon.com/eks/latest/userguide/enable-iam-roles-for-service-accounts.html
- Amazon EKS: Assign IAM roles to Kubernetes service accounts: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- Amazon EKS: Configure Pods to use a Kubernetes service account: https://docs.aws.amazon.com/eks/latest/userguide/pod-configuration.html
- Amazon EKS best practices: Identity and Access Management: https://docs.aws.amazon.com/eks/latest/best-practices/identity-and-access-management.html
- Amazon EKS: EKS Pod Identities: https://docs.aws.amazon.com/eks/latest/userguide/pod-identities.html
- eksctl: IAM Roles for Service Accounts: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html
- AWS CLI: create-open-id-connect-provider: https://docs.aws.amazon.com/cli/latest/reference/iam/create-open-id-connect-provider.html
- AWS IAM: Obtain the thumbprint for an OpenID Connect identity provider: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html
- AWS SDKs and Tools Reference: Assuming a role with web identity or OpenID Connect: https://docs.aws.amazon.com/sdkref/latest/guide/access-assume-role-web.html
- AWS SDK for JavaScript v3: Set credentials in Node.js: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html

## Issues Found
- The manual OIDC thumbprint command did not correctly select the top intermediate CA certificate. I changed the AWS CLI setup to omit `--thumbprint-list`, which is supported by IAM, and added guidance to follow IAM's documented thumbprint procedure if supplying one manually.
- The Kubernetes service account annotation example used `arn:aws:iam::123456789012:eks-my-app-role`, which is not a valid IAM role ARN. I changed it to `arn:aws:iam::123456789012:role/eks-my-app-role`.
- The Node.js AWS SDK v3 example imported `fromWebToken` but did not use it. I removed the unused import because the default credential provider chain detects IRSA environment variables without explicit credential configuration.
- The JWT debugging command decoded the token payload as plain base64. I changed it to translate base64url characters and add padding before decoding.
- The troubleshooting section implied the IRSA webhook appears as a `pod-identity-webhook` pod in `kube-system`. I changed it to explain that the IRSA mutating webhook runs as part of the EKS control plane and provided a pod mutation check instead.
- The EKS Pod Identity comparison and conclusion described it as for EKS 1.24+ clusters. I changed this to refer to supported EKS clusters with compatible platform versions and Linux EC2 worker nodes, matching current AWS documentation.
- The prerequisite version statement referenced an old EKS minimum version. I changed it to require an existing supported EKS cluster.

## Review Notes
The remaining examples and commands match current AWS and Kubernetes guidance at the level appropriate for a tutorial. The S3, DynamoDB, and SQS managed policy examples are intentionally broad examples; production readers should follow the post's later least-privilege guidance and use custom IAM policies.
