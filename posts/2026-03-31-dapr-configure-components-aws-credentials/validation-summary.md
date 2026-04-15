# Validation Summary: How to Configure Dapr Components with AWS Credentials

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (component configuration, secret references)
- AWS (IAM, DynamoDB, STS, IRSA, EC2 instance profiles, ECS task roles)
- Kubernetes (Secrets, ServiceAccounts, Deployments)
- kubectl CLI
- AWS CLI (iam, sts subcommands)

## Sources Consulted
- Dapr DynamoDB state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-dynamodb/
- Dapr component secrets documentation: https://docs.dapr.io/operations/components/component-secrets/
- AWS IAM ARN format reference: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference-arns.html
- AWS STS AssumeRole API reference: https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html
- EKS IRSA documentation: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html

## Issues Found
1. **Incorrect component type name (fixed)**: The post used `state.dynamodb` as the Dapr component type in all YAML examples (Patterns 1, 2). The correct type is `state.aws.dynamodb` per official Dapr documentation. This was a breaking error — the Dapr sidecar would fail to load the component with the wrong type name. All occurrences were updated.

## Review Notes
- The `secretKeyRef` syntax, metadata field names (`accessKey`, `secretKey`, `sessionToken`, `region`, `table`), and `apiVersion: dapr.io/v1alpha1` are all correct per current Dapr docs.
- The IAM ARN formats use the correct pattern with an empty region field (double colon) for IAM resources.
- The `aws sts assume-role` command and jq extraction paths for the STS response are correct.
- The IRSA annotation `eks.amazonaws.com/role-arn` is the correct EKS annotation.
- The decision guide in "Choosing the Right Pattern" labels ECS task roles as "Instance profile" which is a slight simplification — task roles and instance profiles are different IAM mechanisms — but from Dapr's perspective they behave identically (omit credentials, let the SDK resolve them).
- The summary's claim that "credentials are always stored in Kubernetes Secrets rather than in component YAML files" is a best-practice statement, not a technical constraint — Dapr does allow inline values, but the advice is sound.
