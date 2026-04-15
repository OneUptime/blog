# Validation Summary: How to Use Environment-Specific Dapr Secret Stores

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr secret management building block
- Dapr Python SDK (`DaprClient.get_secret`)
- Dapr Go SDK (`client.GetSecret`)
- Dapr local file secret store (`secretstores.local.file`)
- Azure Key Vault (`secretstores.azure.keyvault`)
- HashiCorp Vault (`secretstores.hashicorp.vault`)
- Azure CLI (`az keyvault`)
- HashiCorp Vault CLI (`vault policy`, `vault auth`, `vault write`)
- Dapr component scoping

## Sources Consulted
- Dapr secret stores component reference: https://docs.dapr.io/reference/components-reference/supported-secret-stores/
- Dapr local file secret store spec: https://docs.dapr.io/reference/components-reference/supported-secret-stores/file-secret-store/
- Dapr HashiCorp Vault secret store spec: https://docs.dapr.io/reference/components-reference/supported-secret-stores/hashicorp-vault/
- Dapr Azure Key Vault secret store spec: https://docs.dapr.io/reference/components-reference/supported-secret-stores/azure-keyvault/
- Dapr component scopes documentation: https://docs.dapr.io/operations/components/component-scopes/
- Dapr Python SDK secrets API: https://docs.dapr.io/developing-applications/sdks/python/python-client/
- Dapr Go SDK secrets API: https://docs.dapr.io/developing-applications/sdks/go/go-client/
- Azure CLI Key Vault reference: https://learn.microsoft.com/en-us/cli/azure/keyvault
- HashiCorp Vault Kubernetes auth: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- Cross-referenced with validated posts in this repo (dapr-secrets-api-keys, dapr-least-privilege-secret-access, dapr-government-digital-services)

## Issues Found

### 1. Incorrect metadata field name `tlsCaCert` in HashiCorp Vault component
- **What was wrong:** The HashiCorp Vault secret store component YAML used `tlsCaCert` as the metadata field name for the CA certificate. The correct Dapr metadata field name is `caCert`.
- **What was changed:** Renamed `tlsCaCert` to `caCert` in the production secret store component YAML.
- **Why:** The Dapr HashiCorp Vault component spec documents `caCert` as the field for providing CA certificate content. `tlsCaCert` is not a recognized metadata field and would be silently ignored, causing TLS verification to fail.

### 2. `scopes` field incorrectly nested under `spec`
- **What was wrong:** In the Secret Store Scoping section, the `scopes` field was indented under `spec`, making it a child of the spec object.
- **What was changed:** Moved `scopes` and its list items to root level (same indentation as `apiVersion`, `kind`, `metadata`, `spec`).
- **Why:** Dapr Component YAML defines `scopes` as a root-level field, not a child of `spec`. When nested under `spec`, the scoping configuration would not be recognized by the Dapr sidecar, effectively leaving the component unscoped and accessible to all applications.

### 3. Invalid JSON comment syntax
- **What was wrong:** The dev-secrets.json code block contained a `//` comment (`// secrets/dev-secrets.json (never commit to git)`), which is invalid JSON syntax. Copying this verbatim would produce a JSON parse error.
- **What was changed:** Moved the file path and note to a line above the code block, outside the JSON fence.
- **Why:** JSON does not support comments. A reader copy-pasting the block would get a parse error.

## Review Notes
- The Azure Key Vault section uses `az keyvault set-policy` which is the legacy access policy model. Azure now recommends RBAC-based access control for Key Vault. This is not incorrect but could be noted as a modernization opportunity in a future update.
- The Go code in `getSMTPConfig` ignores errors from `dapr.NewClient()` and `GetSecret` (using `_`). This appears intentional for brevity but is worth noting as it doesn't reflect production-quality error handling.
- The Python SDK code, Go SDK code, all CLI commands, and remaining YAML configurations are correct and use current APIs.
