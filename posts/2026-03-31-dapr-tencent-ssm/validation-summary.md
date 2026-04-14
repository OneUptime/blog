# Validation Summary: How to Use Dapr with Tencent Cloud SSM

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (secrets building block)
- Tencent Cloud Secrets Manager Service (SSM)
- Tencent Cloud CLI (tccli)
- Kubernetes (for storing credentials)
- Go (Dapr Go SDK)
- Redis (as example state store component)

## Sources Consulted
- Dapr Tencent Cloud SSM secret store component reference: https://docs.dapr.io/reference/components-reference/supported-secret-stores/tencentcloud-ssm/
- Dapr Secrets API reference: https://docs.dapr.io/reference/api/secrets_api/
- Dapr component secrets documentation: https://docs.dapr.io/operations/components/component-secrets/
- Dapr Go SDK client package: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Tencent Cloud SSM API documentation: https://www.tencentcloud.com/document/product/1078/38645
- Tencent Cloud SSM SDK source (tencentcloud-sdk-python-intl-en): https://github.com/TencentCloud/tencentcloud-sdk-python-intl-en/blob/master/tencentcloud/ssm/v20190923/ssm_client.py

## Issues Found

### 1. `auth` block indentation error in Redis state store component YAML
- **What was wrong:** The `auth` block was at the root indentation level (same as `spec`), but Dapr requires it to be nested under `spec`.
- **What was changed:** Indented `auth` and `secretStore` by two spaces so they are properly nested under `spec`.
- **Why:** Without correct indentation, the Dapr runtime would not recognize the secret store reference for the Redis component, and the `redisPassword` secretKeyRef would fail to resolve.

### 2. Fabricated `tccli ssm UpdateVersionStage` command
- **What was wrong:** The `UpdateVersionStage` API does not exist in Tencent Cloud SSM. It was confused with AWS Secrets Manager's `UpdateSecretVersionStage` API. The `--MoveToVersion "AWSCURRENT"` parameter also uses an AWS-specific staging label (`AWSCURRENT`) that does not exist in Tencent Cloud SSM.
- **What was changed:** Removed the `UpdateVersionStage` command block and replaced it with a note explaining that Dapr retrieves the current version by default after creating a new version with `PutSecretValue`.
- **Why:** The command would fail if a reader tried to execute it. Tencent Cloud SSM uses a different versioning model than AWS Secrets Manager.

## Review Notes
- The `tccli ssm CreateSecret`, `EnableSecret`, and `PutSecretValue` commands are correct with valid parameter names.
- The Dapr component type `secretstores.tencentcloud.ssm` and metadata fields (`secretId`, `secretKey`, `region`) are accurate per official Dapr documentation.
- The Go SDK usage is correct — `client.GetSecret` returns `map[string]string` and accessing by secret name key is the standard pattern.
- The secrets API curl endpoint with URL-encoded slash (`dapr%2Fdb-password`) is correct.
- Tencent Cloud SSM's versioning behavior with `PutSecretValue` may vary depending on the secret type (custom vs. service credential). Readers working with service credentials should consult Tencent's documentation for version management specifics.
