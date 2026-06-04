# Validation Summary: How to Implement Pod Identity for AWS Workloads with IRSA on Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon EKS
- IAM Roles for Service Accounts (IRSA)
- AWS IAM and STS
- OpenID Connect (OIDC)
- Kubernetes ServiceAccounts and Deployments
- kubectl
- eksctl
- AWS CLI
- Amazon S3 and DynamoDB IAM policies
- Python boto3

## Sources Consulted
- Amazon EKS User Guide: IAM roles for service accounts: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- Amazon EKS User Guide: Create an IAM OIDC provider for your cluster: https://docs.aws.amazon.com/eks/latest/userguide/enable-iam-roles-for-service-accounts.html
- Amazon EKS User Guide: Assign IAM roles to Kubernetes service accounts: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- Amazon EKS Best Practices Guide: Identity and Access Management: https://docs.aws.amazon.com/eks/latest/best-practices/identity-and-access-management.html
- Amazon EKS User Guide: Use IRSA with the AWS SDK: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts-minimum-sdk.html
- eksctl User Guide: IAM Roles for Service Accounts: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html
- Kubernetes kubectl reference: kubectl run: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- AWS CLI Command Reference: iam get-role: https://docs.aws.amazon.com/cli/latest/reference/iam/get-role.html
- Boto3 documentation: Credentials: https://docs.aws.amazon.com/boto3/latest/guide/credentials.html

## Issues Found
- The OIDC verification snippet used `$OIDC_URL` without setting it. Updated the command to store the cluster OIDC issuer URL in `OIDC_URL` before checking IAM OIDC providers.
- The post suggested `aws eks update-cluster-config` as an AWS CLI alternative for creating an IAM OIDC provider. That command does not create an IAM OIDC provider for IRSA, so the incorrect AWS CLI block was removed.
- The IAM role creation snippet used `${AWS_ACCOUNT_ID}` without defining it. Added an `aws sts get-caller-identity` command to set `AWS_ACCOUNT_ID`.
- The service account apply step assumed the `production` namespace already existed. Added an idempotent `kubectl create namespace ... --dry-run=client | kubectl apply -f -` command before applying the service account.
- The deployment example manually set `AWS_WEB_IDENTITY_TOKEN_FILE` and `AWS_ROLE_ARN`. For IRSA, the EKS pod identity webhook injects these values; manually defining them can prevent correct webhook mutation in some cases. Removed those manual environment variables from the pod spec.
- The test pod command used `kubectl run --serviceaccount`, which is not a current `kubectl run` option. Replaced it with a `--overrides` JSON snippet that sets `spec.serviceAccountName`.
- The troubleshooting section suggested tailing `aws-pod-identity-webhook` logs in `kube-system`. In managed EKS, the IRSA webhook is a control plane component, so normal workload logs are not available. Removed the log command and kept the webhook configuration check.
- The security audit example used the IAM credential report to review pod IAM role usage. IAM credential reports cover IAM users, not role usage. Replaced it with `aws iam get-role --query "Role.RoleLastUsed"` for role last-used information.

## Review Notes
- The post remains a valid IRSA tutorial after the corrections.
- EKS Pod Identity is now also available as a newer alternative to IRSA, but the post specifically covers IRSA and the IRSA workflow is still documented and supported.
- The Python example is syntactically valid and uses boto3's default credential chain; the unused `os` import is harmless but could be removed in a style cleanup.
