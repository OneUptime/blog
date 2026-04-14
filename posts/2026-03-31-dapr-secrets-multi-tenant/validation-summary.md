# Validation Summary: How to Use Dapr Secrets Management for Multi-Tenant Applications

## Status
validated

## Post Type
Tutorial / Architecture Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Secrets Management API
- Kubernetes (namespaces, secrets)
- HashiCorp Vault (KV secrets engine)
- Python (httpx async HTTP client)

## Sources Consulted
- Dapr Secrets API reference: https://docs.dapr.io/reference/api/secrets_api/
- Dapr Component schema reference: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Component scoping documentation: https://docs.dapr.io/operations/components/component-scopes/
- Dapr secret scoping how-to: https://docs.dapr.io/developing-applications/building-blocks/secrets/secrets-scopes/
- Dapr HashiCorp Vault component reference: https://docs.dapr.io/reference/components-reference/supported-secret-stores/hashicorp-vault/
- Dapr Kubernetes secret store reference: https://docs.dapr.io/reference/components-reference/supported-secret-stores/kubernetes-secret-store/
- Kubernetes kubectl documentation: https://kubernetes.io/docs/reference/kubectl/

## Issues Found

### Issue 1: `scopes` field incorrectly nested inside `spec` (Strategy 3)
- **What was wrong:** Both Vault Component YAML examples in Strategy 3 had the `scopes` field nested inside `spec`. In Dapr's Component schema, `scopes` is a top-level field (at the same level as `apiVersion`, `kind`, `metadata`, and `spec`), not a child of `spec`. Placing it inside `spec` would cause Dapr to ignore the scoping rules, potentially allowing unauthorized services to access tenant secrets.
- **What was changed:** Moved `scopes` from inside `spec` to the top level of the Component YAML in both tenant-a and tenant-b examples.
- **Why:** The Dapr Component schema defines `scopes` as a top-level array field per the official component schema reference.

### Issue 2: Incorrect secret response key access in Python code (Strategy 2)
- **What was wrong:** The Vault commands store secrets with the key name `value` (e.g., `vault kv put secret/tenant-a/db-password value="tenant-a-db-pass"`), but the Python code accessed the response using `resp.json()[secret_key]` where `secret_key` is `"db-password"`. The Dapr Secrets API returns the key-value pairs as stored in the backend, so the response would be `{"value": "tenant-a-db-pass"}`, not `{"db-password": "tenant-a-db-pass"}`. This would cause a `KeyError` at runtime.
- **What was changed:** Changed `resp.json()[secret_key]` to `resp.json()["value"]` to match the key name used in the Vault put commands.
- **Why:** The Dapr Secrets API response mirrors the key names stored in the secret backend. Since the Vault commands use `value=` as the key, the response key is `"value"`.

## Review Notes
- The overall multi-tenant isolation strategies described are sound and align with Dapr's recommended practices.
- The Vault component examples omit the `vaultToken` or `vaultTokenMountPath` metadata field, which is required for authentication. This is acceptable for a blog post focusing on the multi-tenant pattern, but readers should be aware they need to configure Vault authentication.
- The `httpx` import is missing from the Python code example. This is typical for blog snippets and not flagged as an error.
- The 403 status code claim for unauthorized scoped access is correct per Dapr documentation.
