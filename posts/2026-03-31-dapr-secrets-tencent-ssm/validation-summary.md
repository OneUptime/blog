# Validation Summary: How to Configure Dapr with Tencent Cloud SSM Secret Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (secret store component)
- Tencent Cloud Secret Manager (SSM)
- Tencent Cloud CAM (IAM policies)
- Kubernetes (secret storage)
- Python (httpx async client)
- tccli (Tencent Cloud CLI)

## Sources Consulted
- Dapr Tencent Cloud SSM secret store component reference: https://docs.dapr.io/reference/components-reference/supported-secret-stores/tencentcloud-ssm/
- Dapr Secrets API reference: https://docs.dapr.io/reference/api/secrets_api/
- Dapr component schema specification: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr component scoping documentation: https://docs.dapr.io/operations/components/component-scopes/
- Dapr How-To: Retrieve a secret: https://docs.dapr.io/developing-applications/building-blocks/secrets/howto-secrets/

## Issues Found

1. **Incorrect metadata field name `secretID`** — The blog used `secretID` (uppercase D) but the correct Dapr metadata field name is `secretId` (camelCase with lowercase d), per the official component reference. Fixed in the component YAML.

2. **Incorrect version query parameter `metadata.version`** — The blog used `metadata.version` to retrieve a specific secret version, but the correct Dapr query parameter is `metadata.version_id`. Fixed in the curl example.

3. **Incorrect `scopes` placement** — The blog showed `scopes` nested under `spec`, but per the Dapr component schema specification, `scopes` is a root-level field on the Component resource, not a child of `spec`. Fixed the scoping example to show a complete component manifest with `scopes` at the correct level.

## Review Notes
- The Tencent Cloud CLI (`tccli`) command syntax and CAM policy format appear correct based on Tencent Cloud documentation conventions.
- The Python code example correctly uses `httpx.AsyncClient` and demonstrates proper JSON parsing of the secret value.
- The Dapr secrets API endpoint format (`/v1.0/secrets/{storeName}/{key}`) is correct.
- The component type `secretstores.tencentcloud.ssm` and version `v1` are correct per official Dapr docs.
- The `secretKeyRef` pattern for referencing Kubernetes secrets in Dapr component metadata is correctly used.
