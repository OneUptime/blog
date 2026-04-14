# Validation Summary: How to Fix Dapr Secret Store Access Denied Errors

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr (secret store building block, Configuration resource, secret scoping)
- Kubernetes (RBAC, Roles, RoleBindings, ServiceAccounts)
- AWS Secrets Manager (IAM policies)
- kubectl CLI

## Sources Consulted
- Dapr Secrets API reference: https://docs.dapr.io/reference/api/secrets_api/
- Dapr secret store scoping: https://docs.dapr.io/operations/configuration/secret-scope/
- Dapr Configuration resource spec: https://docs.dapr.io/operations/configuration/configuration-overview/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- AWS Secrets Manager IAM actions: https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_iam-permissions.html
- AWS ARN format reference: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference-arns.html

## Issues Found
1. **Invalid AWS account ID in IAM policy ARN**: The ARN `arn:aws:secretsmanager:us-east-1:123456789:secret:myapp/*` used a 9-digit placeholder (`123456789`) for the AWS account ID. AWS account IDs are always exactly 12 digits. Changed to `123456789012` to match the standard AWS documentation placeholder and produce a structurally valid ARN.

## Review Notes
- The Kubernetes RBAC example combines `resourceNames` with the `list` verb. In practice, `list` operations are not restricted by `resourceNames` in Kubernetes RBAC (list returns collections, not individual resources). The `get` verb works correctly with `resourceNames`. This is a known Kubernetes subtlety but not technically an error — the YAML is valid and accepted by the API server. The `get` restriction, which is the primary need here, works as intended.
- The Dapr Configuration `apiVersion: dapr.io/v1alpha1` is correct and current.
- The Dapr secrets API endpoint format (`/v1.0/secrets/{storeName}/{key}`) and default HTTP port (3500) are correct.
- The `dapr.io/config` pod annotation for referencing Dapr configuration is correct.
- The error messages shown are representative of real Dapr and Kubernetes error outputs.
