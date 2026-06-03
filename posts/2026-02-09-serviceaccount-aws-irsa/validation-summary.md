# Validation Summary: How to Use ServiceAccount for AWS IAM Roles with IRSA

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon EKS
- Kubernetes ServiceAccounts and Pods
- AWS IAM Roles for Service Accounts (IRSA)
- OpenID Connect (OIDC)
- AWS STS
- AWS CLI and eksctl
- AWS SDK for Go v2
- Python boto3
- Amazon S3, DynamoDB, and SQS IAM policies
- AWS CloudTrail and CloudWatch Logs

## Sources Consulted
- Amazon EKS User Guide: IAM roles for service accounts: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- Amazon EKS User Guide: Assign IAM roles to Kubernetes service accounts: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- Amazon EKS User Guide: Configure Pods to use a Kubernetes service account: https://docs.aws.amazon.com/eks/latest/userguide/pod-configuration.html
- Amazon EKS User Guide: Configure the AWS Security Token Service endpoint for a service account: https://docs.aws.amazon.com/eks/latest/userguide/configure-sts-endpoint.html
- Amazon EKS Pod Identity Webhook documentation: https://github.com/aws/amazon-eks-pod-identity-webhook
- AWS STS API Reference: AssumeRoleWithWebIdentity: https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRoleWithWebIdentity.html
- AWS SDK for Go v2 Developer Guide: Configure the SDK: https://docs.aws.amazon.com/sdk-for-go/v2/developer-guide/configure-gosdk.html
- Boto3 documentation: Credentials and Assume Role With Web Identity Provider: https://docs.aws.amazon.com/boto3/latest/guide/credentials.html
- AWS IAM User Guide: Global condition context keys: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- Amazon S3 User Guide: Bucket policy examples using condition keys: https://docs.aws.amazon.com/AmazonS3/latest/userguide/amazon-s3-policy-keys.html

## Issues Found
- The auditability description said CloudTrail shows which pod accessed which resource. CloudTrail provides AWS auditability for the assumed role and web identity subject, but not a guaranteed pod-level identity for every AWS service event. Updated the wording to say CloudTrail shows the IAM role and ServiceAccount identity.
- The ServiceAccount annotation section said `eks.amazonaws.com/token-expiration` controls credential lifetime. That annotation controls the projected ServiceAccount token lifetime; STS credentials from `AssumeRoleWithWebIdentity` default to one hour unless session duration is configured within the role's maximum. Updated the explanation.
- The cross-account access example created a trusted target account role but did not attach permissions to that target role. Added an `aws iam attach-role-policy` command so the assumed role has S3 read permissions in the target account.
- The security condition-key example used `aws:SourceAccount` and a private `aws:SourceIp` range for ordinary S3 access from a pod. `aws:SourceAccount` is only present for supported AWS service-principal calls, and the private source IP condition would not generally match S3 requests. Replaced the example with an S3 `s3:prefix` condition for `ListBucket` plus scoped `GetObject` access.

## Review Notes
The main IRSA flow, trust policy shape, ServiceAccount annotation, pod environment variables, Go SDK default credential loading, boto3 web identity support, STS regional endpoint annotation, and AWS CLI commands are consistent with current official documentation. Future improvements could use placeholders for account ID and OIDC provider host throughout the snippets to make them easier to adapt across regions and accounts.
