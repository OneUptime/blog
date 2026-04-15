# Validation Summary: How to Use Dapr with AWS IAM Roles for Service Accounts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (distributed application runtime)
- AWS IAM (Identity and Access Management)
- AWS EKS (Elastic Kubernetes Service)
- IAM Roles for Service Accounts (IRSA)
- AWS DynamoDB
- Kubernetes (Deployments, Service Accounts)
- eksctl CLI
- AWS CLI

## Sources Consulted
- Dapr component reference for AWS DynamoDB state store (https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-dynamodb/)
- AWS EKS documentation on IAM Roles for Service Accounts (https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html)
- AWS IAM ARN format reference (https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_identifiers.html)
- Kubernetes Deployment API reference (https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/deployment-v1/)
- Dapr Kubernetes annotations reference (https://docs.dapr.io/reference/arguments-annotations-overview/)
- Existing blog posts in this repository for naming conventions

## Issues Found

1. **Incorrect Dapr component type name**: The Dapr DynamoDB state store component used `state.dynamodb`, which is the deprecated name. Changed to `state.aws.dynamodb` to match the current Dapr naming convention where all AWS components use the `aws.` prefix (e.g., `state.aws.dynamodb`, `pubsub.aws.snssqs`, `bindings.aws.s3`).

2. **Missing required Deployment fields**: The Kubernetes Deployment YAML was missing the required `spec.selector.matchLabels` field and pod template labels. Without `spec.selector`, `kubectl apply` would reject the manifest with a validation error. Added `spec.selector.matchLabels` with `app: order-service` and matching `metadata.labels` on the pod template.

## Review Notes
- The IAM ARN format `arn:aws:iam::123456789012:...` (double colon, no region) is correct for IAM, which is a global service.
- The trust policy heredoc correctly uses unquoted `EOF` so that `${OIDC_PROVIDER}` is shell-expanded, while the IAM policy heredoc correctly uses quoted `'EOF'` to prevent expansion.
- The IRSA verification step using `kubectl exec` to check for `AWS_WEB_IDENTITY_TOKEN_FILE` is the standard debugging approach.
- The Dapr state API endpoint `http://localhost:3500/v1.0/state/statestore/test-key` is correct for the default Dapr HTTP port and state GET operation.
- The post uses placeholder account ID `123456789012` consistently throughout, which is good practice for tutorial content.
