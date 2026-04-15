# Validation Summary: How to Use Dapr AWS Bindings with IAM Roles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (bindings, component configuration)
- AWS IAM (roles, trust policies, managed policies, inline policies)
- AWS STS (AssumeRole, AssumeRoleWithWebIdentity)
- AWS SQS (bindings)
- AWS S3 (permissions example)
- Amazon EKS (IRSA - IAM Roles for Service Accounts)
- Kubernetes (ServiceAccount, Deployment, OIDC)
- eksctl CLI

## Sources Consulted
- Dapr AWS SQS binding component spec: https://docs.dapr.io/reference/components-reference/supported-bindings/sqs/
- AWS IAM ARN format documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_identifiers.html
- AWS EKS IRSA documentation: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- AWS IAM trust policy reference: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_principal.html
- AWS STS AssumeRoleWithWebIdentity documentation: https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRoleWithWebIdentity.html
- eksctl OIDC provider documentation: https://eksctl.io/usage/iamserviceaccounts/

## Issues Found
1. **Incorrect Dapr SQS binding metadata field name**: The Dapr component spec used `queueName` as the metadata key for the SQS queue. The correct metadata field name per the Dapr AWS SQS binding specification is `queueNameOrUrl`, which accepts either a queue name or a full queue URL. Changed `queueName` to `queueNameOrUrl` on the component YAML.

## Review Notes
- The `aws:RequestedRegion` condition in the STS trust policy (first example) is syntactically valid but unusual for a trust policy. This condition restricts based on the AWS region targeted by the API call, not the caller's location. For the global STS endpoint, this may not behave as intuitively expected. More conventional trust policy conditions include `sts:ExternalId` or `aws:SourceArn`.
- Step 3 attaches `AmazonSQSFullAccess` managed policy, which grants broad SQS permissions. The post later correctly demonstrates least-privilege scoping in the "Least Privilege Policy Design" section. This pedagogical progression is fine, but readers should note that `AmazonSQSFullAccess` should not be used in production — the least-privilege policy shown later is the recommended approach.
- The Deployment YAML snippet omits required fields like `spec.selector` and `spec.replicas`, which is acceptable for a focused tutorial snippet but would not be valid as-is.
- AWS has introduced EKS Pod Identity as a newer alternative to IRSA. While IRSA remains fully supported and widely used, future readers may want to evaluate Pod Identity as well.
