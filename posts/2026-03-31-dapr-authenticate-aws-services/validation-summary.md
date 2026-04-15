# Validation Summary: How to Authenticate Dapr with AWS Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (component configuration, secret references)
- AWS DynamoDB (state store)
- AWS SQS (pub/sub)
- AWS IAM (policies, roles, instance profiles)
- AWS EKS with IRSA (IAM Roles for Service Accounts)
- AWS STS (temporary credentials / session tokens)
- Kubernetes (secrets, service accounts, annotations)

## Sources Consulted
- Dapr AWS DynamoDB state store component reference — https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-dynamodb/
- Dapr AWS SNS/SQS and SQS pub/sub component reference — https://docs.dapr.io/reference/components-reference/supported-pubsub/
- Dapr component secret references — https://docs.dapr.io/operations/components/component-secrets/
- AWS IAM ARN format documentation — https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_identifiers.html
- AWS EKS IRSA documentation — https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- Existing validated posts in this repository for Dapr AWS component naming conventions

## Issues Found
1. **Incorrect DynamoDB state store component type (2 occurrences)**: The component `spec.type` was set to `state.dynamodb`. The correct type is `state.aws.dynamodb`. All current Dapr AWS components use the `aws.` prefix in their type name. Using the wrong type would cause Dapr to fail to load the component at runtime. Fixed both occurrences (in the Explicit Credentials and Instance Profile examples).

2. **Trust policy code block tagged as YAML instead of JSON**: The trust-policy.json content was inside a code fence tagged as `yaml`. Changed to `json` since the content is a JSON file, and updated the comment syntax accordingly.

## Review Notes
- The `pubsub.aws.sqs` component type used in the Session Tokens section is correct — it is a valid SQS-only pub/sub component (distinct from the more common `pubsub.aws.snssqs` SNS+SQS fan-out component).
- The IAM policy for DynamoDB shows basic CRUD permissions (GetItem, PutItem, DeleteItem, Query). For production use, additional permissions like `dynamodb:BatchWriteItem` or `dynamodb:BatchGetItem` may be needed if Dapr's bulk state operations are used, but the policy shown is correct for basic state operations.
- The IRSA trust policy and service account annotation patterns are correct and follow current AWS EKS best practices.
- The secret reference format using `secretKeyRef` with `name` and `key` fields is the correct Dapr component secret reference syntax.
- The post correctly recommends IRSA over long-lived credentials for production EKS deployments, which aligns with AWS security best practices.
