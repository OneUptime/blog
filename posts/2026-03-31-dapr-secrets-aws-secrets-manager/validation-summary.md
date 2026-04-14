# Validation Summary: How to Use Dapr Secrets Management with AWS Secrets Manager

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (secrets management building block)
- AWS Secrets Manager
- AWS IAM (policies, IRSA)
- Kubernetes (EKS, Service Accounts, Secrets)
- Go (Dapr Go SDK)
- Python (Dapr Python SDK)
- AWS CLI

## Sources Consulted
- Dapr AWS Secret Manager component reference: https://docs.dapr.io/reference/components-reference/supported-secret-stores/aws-secret-manager/
- Dapr Secrets API reference: https://docs.dapr.io/reference/api/secrets_api/
- Dapr Secrets overview: https://docs.dapr.io/developing-applications/building-blocks/secrets/secrets-overview/
- AWS IAM Actions for Secrets Manager: https://docs.aws.amazon.com/service-authorization/latest/reference/list_awssecretsmanager.html
- AWS EKS IRSA documentation: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- Dapr Go SDK client reference: https://github.com/dapr/go-sdk
- Dapr Python SDK client reference: https://github.com/dapr/python-sdk

## Issues Found

1. **Incorrect component type name**: The post used `secretstores.aws.secretsmanager` (with trailing 's' in "secretsmanager") but the correct Dapr component type is `secretstores.aws.secretmanager` (no trailing 's'). Fixed in both YAML component definitions.

2. **Incorrect version metadata query parameter names**: The post used camelCase `metadata.versionId` and `metadata.versionStage` but Dapr uses snake_case for these parameters: `metadata.version_id` and `metadata.version_stage`. Fixed both occurrences.

3. **ListSecrets IAM action with unsupported resource constraint**: The post had `secretsmanager:ListSecrets` in the same IAM policy statement as `secretsmanager:GetSecretValue`, both scoped to `arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/*`. However, `ListSecrets` does not support resource-level permissions in AWS IAM and requires `Resource: "*"`. Split into two separate policy statements: one for `GetSecretValue` with the scoped resource ARN, and one for `ListSecrets` with `Resource: "*"`.

## Review Notes
- The IAM ARN `arn:aws:iam::123456789012:role/DaprSecretsRole` uses a double colon between `iam` and the account ID, which is correct since IAM is a global (non-regional) service.
- The Go SDK, Python SDK, HTTP API examples, and bulk secrets endpoint are all technically correct.
- The Mermaid architecture diagram accurately represents the Dapr sidecar pattern with AWS Secrets Manager.
- The AWS CLI commands for creating secrets use correct syntax and flags.
