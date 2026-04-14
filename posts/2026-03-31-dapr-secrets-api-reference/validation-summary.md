# Validation Summary: How to Use the Dapr Secrets API Reference

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- Dapr Secrets API (HTTP API v1.0)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Kubernetes Secrets (as a Dapr secret store backend)
- HashiCorp Vault (as a Dapr secret store backend)
- Dapr Component YAML configuration

## Sources Consulted
- Dapr Secrets API reference: https://docs.dapr.io/reference/api/secrets_api/
- Dapr secret store components overview: https://docs.dapr.io/reference/components-reference/supported-secret-stores/
- Dapr Kubernetes secret store docs: https://docs.dapr.io/reference/components-reference/supported-secret-stores/kubernetes-secret-store/
- Dapr HashiCorp Vault secret store docs: https://docs.dapr.io/reference/components-reference/supported-secret-stores/hashicorp-vault/
- Dapr secret store component scoping: https://docs.dapr.io/operations/components/component-scopes/
- Dapr secret scoping (Configuration resource): https://docs.dapr.io/operations/configuration/secret-scope/
- Dapr component secret references: https://docs.dapr.io/operations/components/component-secrets/
- Dapr JavaScript SDK: https://docs.dapr.io/developing-applications/sdks/js/

## Issues Found

### 1. Misleading curl example for retrieving a specific key
**What was wrong:** The "Getting a Specific Key from a Secret" section included a curl command with `?metadata.version_id=latest`, implying this retrieves a specific key from a secret. The `metadata.version_id` query parameter retrieves a specific **version** of a secret, not a specific key within it. The Dapr Secrets API does not support retrieving individual keys via query parameters; the full secret is returned and the caller must extract the desired key in application code.

**What was changed:** Removed the misleading curl command and updated the section description to clarify that the API returns all key-value pairs for a secret and the caller extracts the needed key in code. The JavaScript SDK example (which correctly demonstrates this approach) was retained.

### 2. Inaccurate description of secret store scoping
**What was wrong:** The "Scoping Secret Access" section stated "Restrict which applications can access which secrets" and showed a component-level `scopes` field. Component-level `scopes` restricts which Dapr **app IDs** can use the entire secret store component, not which individual secrets within the store are accessible. Per-secret access control requires a separate Dapr `Configuration` resource with `spec.secrets.scopes`.

**What was changed:** Renamed the section to "Scoping Secret Store Access", updated the description to accurately state that `scopes` limits which apps can use a secret store component, and added a note pointing readers to the Dapr Configuration resource for per-secret access control.

## Review Notes
- The JavaScript SDK example uses CommonJS `require()` syntax. The official Dapr JS SDK quickstarts use ES module `import` syntax. Both work, but `import` is more current. Not changed since `require` is not incorrect.
- The `auth` and `scopes` fields are correctly placed at the top level of the Component YAML (siblings to `apiVersion`, `kind`, `metadata`, and `spec`), matching official Dapr documentation.
- All API endpoints, response formats, component type names (`secretstores.kubernetes`, `secretstores.hashicorp.vault`), metadata field names (`vaultAddr`, `vaultToken`), and `secretKeyRef`/`auth.secretStore` patterns verified correct against official documentation.
