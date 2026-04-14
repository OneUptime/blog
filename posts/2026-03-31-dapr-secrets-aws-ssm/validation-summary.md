# Validation Summary: How to Configure Dapr with AWS SSM Parameter Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (secret store component)
- AWS Systems Manager (SSM) Parameter Store
- AWS IAM (policies and IRSA)
- Amazon EKS (IAM Roles for Service Accounts)
- eksctl CLI
- AWS CLI
- Kubernetes (Deployments, annotations, service accounts)

## Sources Consulted
- Dapr AWS SSM Parameter Store secret store component reference: https://docs.dapr.io/reference/components-reference/supported-secret-stores/aws-parameter-store/
- Dapr Secrets API reference: https://docs.dapr.io/reference/api/secrets_api/
- AWS IAM ARN format documentation
- eksctl CLI documentation for `create iamserviceaccount`

## Issues Found
1. **Bulk secrets endpoint had an invalid query parameter (line 119)**: The original post used `curl "http://localhost:3500/v1.0/secrets/ssm-store/bulk?metadata.path=/myapp"` with a `metadata.path` query parameter. The Dapr bulk secrets API (`/v1.0/secrets/{storeName}/bulk`) does not accept query parameters according to the official API reference. The component's `prefix` metadata field already scopes which SSM parameters are returned in a bulk request. Fixed by removing the query parameter and updating the description to clarify the prefix handles scoping.

## Review Notes
- The component type `secretstores.aws.parameterstore` is correct per official Dapr documentation.
- The metadata fields `region`, `prefix`, `accessKey`, and `secretKey` are all documented and correctly named.
- The IAM ARN format `arn:aws:iam::123456789012:policy/DaprSSMPolicy` is correct (double colon because IAM is a global service with no region in the ARN).
- The IAM policy permissions (`ssm:GetParameter`, `ssm:GetParameters`, `ssm:GetParametersByPath`) are appropriate for the described use case.
- The `secretKeyRef` pattern for referencing credentials from another Kubernetes secret is standard Dapr practice.
- The Kubernetes deployment annotations (`dapr.io/enabled`, `dapr.io/app-id`) are correct.
- The note about IRSA removing the need for explicit credentials in the component spec is accurate.
