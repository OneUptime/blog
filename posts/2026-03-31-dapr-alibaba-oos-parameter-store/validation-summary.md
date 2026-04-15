# Validation Summary: How to Use Dapr with Alibaba Cloud OOS Parameter Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (secrets building block)
- Alibaba Cloud OOS (Operation Orchestration Service) Parameter Store
- Alibaba Cloud RAM (Resource Access Management)
- Aliyun CLI
- Go (Dapr Go SDK)
- Kubernetes (Dapr component configuration)
- Redis (as example downstream component)

## Sources Consulted
- Dapr Alibaba Cloud OOS Parameter Store component reference: https://docs.dapr.io/reference/components-reference/supported-secret-stores/alicloud-oos-parameter-store/
- Dapr Secrets API reference: https://docs.dapr.io/reference/api/secrets_api/
- Dapr Go SDK (client/secret.go): https://github.com/dapr/go-sdk/blob/main/client/secret.go
- Dapr secret scopes configuration: https://docs.dapr.io/operations/configuration/secret-scope/
- Alibaba Cloud OOS CreateParameter API: https://www.alibabacloud.com/help/en/oos/developer-reference/api-oos-2019-06-01-createparameter
- Alibaba Cloud OOS CreateSecretParameter API: https://www.alibabacloud.com/help/en/oos/developer-reference/api-oos-2019-06-01-createsecretparameter

## Issues Found

1. **Incorrect metadata field names in Dapr component YAML (High severity)**
   - `accessKeyID` was incorrect; changed to `accessKeyId` (camelCase, not mixed case).
   - `accessKey` was incorrect; changed to `accessKeySecret` (the correct Dapr metadata field name for this component).

2. **Incorrect OOS CLI command for encrypted parameters (Medium severity)**
   - The post used `aliyun oos CreateParameter` with `--Type="SecureString"` for encrypted parameters. Alibaba Cloud OOS uses a separate API `CreateSecretParameter` with `--Type="Secret"` for encrypted parameters. "SecureString" is an AWS SSM concept, not an Alibaba OOS concept. Fixed to use the correct API and type.

3. **Incorrect `auth` field placement in Redis state store YAML (High severity)**
   - `auth:` was placed as a sibling of `spec:` (top-level field). In Dapr component YAML, `auth` must be nested inside `spec:`. Fixed indentation to place `auth` under `spec`.

4. **Non-existent RAM policy name (Medium severity)**
   - The post referenced `AliyunOOSReadOnlyAccess` as a system policy, but this does not appear to be a built-in Alibaba Cloud system policy. Changed to describe the specific IAM actions needed (`oos:GetParameter` and `oos:GetSecretParameter`) instead of referencing a non-existent policy name.

## Review Notes
- The Dapr secrets API paths, Go SDK usage, secret scopes configuration, and overall architecture explanation are all correct.
- The post correctly URL-encodes forward slashes in the curl example for parameter names containing `/`.
- The Go code example is missing a `context` import but this is acceptable as it's a snippet, not a complete file.
