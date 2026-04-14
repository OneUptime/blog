# Validation Summary: How to Implement Least Privilege Secret Access with Dapr Scoping

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (component scoping, secret stores, Configuration resources)
- Azure Key Vault (via `secretstores.azure.keyvault`)
- Kubernetes Secrets (via `secretstores.kubernetes`)
- HashiCorp Vault (via `secretstores.hashicorp.vault`)
- Dapr Python SDK (`dapr.clients.DaprClient`)
- Kubernetes RBAC (Role, RoleBinding)

## Sources Consulted
- Dapr component scoping docs: https://docs.dapr.io/operations/components/component-scopes/
- Dapr secret scoping (Configuration resource): https://docs.dapr.io/operations/configuration/secret-scope/
- Dapr Kubernetes secret store reference: https://docs.dapr.io/reference/components-reference/supported-secret-stores/kubernetes-secret-store/
- Dapr HashiCorp Vault secret store reference: https://docs.dapr.io/reference/components-reference/supported-secret-stores/hashicorpvault/
- Dapr Azure Key Vault secret store reference: https://docs.dapr.io/reference/components-reference/supported-secret-stores/azure-keyvault/
- Dapr Python SDK source (GetSecretResponse)

## Issues Found

### Issue 1: `scopes` field incorrectly nested under `spec`
- **What was wrong:** All YAML examples placed the `scopes` field indented under `spec`, making it a child of the component spec. In Dapr, `scopes` is a top-level field on the Component resource, at the same level as `apiVersion`, `kind`, `metadata`, and `spec`.
- **What was changed:** Moved `scopes` to the root level in all four Component YAML blocks (payment-secrets, app-secrets, orders-secrets, auth-secrets).
- **Why:** Per Dapr docs, the correct structure is `scopes` as a sibling of `spec`, not nested within it. Nesting it under `spec` would cause it to be ignored by the Dapr runtime.

### Issue 2: `allowedSecrets` and `deniedSecrets` shown as component metadata fields
- **What was wrong:** The post showed `allowedSecrets` and `deniedSecrets` as metadata entries (name/value pairs) under `spec.metadata` of a Component resource, with comma-separated string values. This is incorrect — these fields belong in a separate Dapr `Configuration` resource under `spec.secrets.scopes`, and their values are YAML arrays, not comma-separated strings.
- **What was changed:** Replaced the incorrect component metadata approach with the correct Dapr Configuration resource format. The Allowed Secrets List, Denied Secrets List, and Per-Service Secret Components sections were all updated to show the proper `Configuration` kind with `spec.secrets.scopes` containing `storeName`, `defaultAccess`, and `allowedSecrets`/`deniedSecrets` as YAML arrays.
- **Why:** Per Dapr's secret scoping documentation, secret-level access control is configured through a Configuration resource, not through component metadata. Using the wrong resource kind would result in the restrictions not being applied.

## Review Notes
- The `vaultKVPrefix` field on the HashiCorp Vault component is used correctly by name, but the example values (`"secret/orders"`, `"secret/auth"`) combine the engine path with the prefix. Since the default `enginePath` is already `"secret"`, a value like `"secret/orders"` could result in a double path (`secret/data/secret/orders/...`). In practice, the prefix should likely be just `"orders"` or `"auth"` if the default engine path is used. This is a minor semantic concern and was not changed since it depends on the user's Vault configuration.
- The Python SDK code correctly uses `secret.secret["password"]` to access the returned dictionary, which is valid per the `GetSecretResponse` type.
- The Kubernetes RBAC section is standard and correct.
