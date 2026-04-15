# Validation Summary: How to Use Dapr with AWS IAM

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (component model, sidecar, bindings API)
- AWS IAM (roles, policies, instance profiles)
- AWS EKS (IRSA - IAM Roles for Service Accounts)
- AWS EC2 (instance profiles)
- AWS S3 (used as example binding target)
- Kubernetes (secrets, ServiceAccounts, annotations)

## Sources Consulted
- Dapr Bindings API reference (HTTP API: POST /v1.0/bindings/{name})
- Dapr AWS S3 binding component specification (bindings.aws.s3)
- Dapr component secrets reference (secretKeyRef usage in component metadata)
- AWS IAM documentation for managed policy ARN format (arn:aws:iam::aws:policy/*)
- AWS EKS IRSA documentation (OIDC trust policies, ServiceAccount annotations)
- AWS IAM instance profile CLI commands (create-instance-profile, add-role-to-instance-profile, associate-iam-instance-profile)

## Issues Found
1. **Incorrect HTTP method for testing bindings endpoint** (line 136): The post used `curl -X GET http://localhost:3500/v1.0/bindings/s3-binding` to test component connectivity. The Dapr Bindings HTTP API only supports POST for invoking output bindings; a GET request would return a 405 Method Not Allowed error. Changed to `curl -X POST` with a JSON body containing `{"operation": "list"}` to properly invoke the S3 list operation and verify both sidecar connectivity and AWS authentication.

## Review Notes
- The IRSA trust policy example omits the optional `<oidc-provider>:aud` condition (`"sts.amazonaws.com"`). While not required, including it is an AWS best practice for tighter scoping. This is not an error — the policy works without it.
- The static credentials section correctly notes this approach is for development only. The secretKeyRef pattern shown relies on Dapr's default Kubernetes secret store, which is automatically available when running on Kubernetes.
- EKS Pod Identity (a newer alternative to IRSA) is not mentioned. This is acceptable since IRSA remains the more widely adopted approach and the post doesn't claim to be exhaustive.
