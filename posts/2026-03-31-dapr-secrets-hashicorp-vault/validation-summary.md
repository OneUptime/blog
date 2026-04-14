# Validation Summary: How to Use Dapr Secrets Management with HashiCorp Vault

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (secrets management building block)
- HashiCorp Vault (KV v2 secrets engine)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Dapr Python SDK (`dapr.clients`)
- Vault CLI
- Kubernetes (for deployment context)

## Sources Consulted
- [Dapr HashiCorp Vault Secret Store Component Spec](https://docs.dapr.io/reference/components-reference/supported-secret-stores/hashicorp-vault/) — verified all supported metadata fields, authentication methods, and default values
- [Dapr Secrets API Reference](https://docs.dapr.io/reference/api/secrets_api/) — verified HTTP API path format
- [Dapr Component Secrets Reference](https://docs.dapr.io/operations/components/component-secrets/) — verified secretKeyRef usage in components
- [HashiCorp Vault KV v2 Documentation](https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2) — verified CLI commands and API paths
- [HashiCorp Vault AppRole Auth](https://developer.hashicorp.com/vault/docs/auth/approle) — verified AppRole setup commands
- [HashiCorp Vault Kubernetes Auth](https://developer.hashicorp.com/vault/docs/auth/kubernetes) — verified Kubernetes auth setup commands
- [Vault Agent Injector](https://developer.hashicorp.com/vault/docs/platform/k8s/injector) — verified token injection approach for Kubernetes

## Issues Found

### 1. Non-existent Dapr component fields for AppRole and Kubernetes auth (Critical)
**What was wrong:** The post presented AppRole and Kubernetes as natively supported authentication methods in the Dapr Vault component, using non-existent metadata fields: `vaultAuth`, `roleID`, `secretID`, and `vaultKubernetesRole`. The Dapr Vault component only supports token-based authentication via `vaultToken` or `vaultTokenMountPath`.

**What was changed:** Replaced the AppRole component YAML to use `vaultToken` with a `secretKeyRef`, with instructions to obtain the token externally via AppRole login. Replaced the Kubernetes auth component YAML to use `vaultTokenMountPath` with the Vault Agent Injector approach. Updated section headings and explanatory text to accurately reflect that Dapr uses tokens obtained through these auth methods, rather than performing the auth directly.

**Why:** These configurations would fail at runtime since the Dapr Vault component does not recognize these fields. The official Dapr documentation only lists token-based authentication fields.

### 2. Incorrect `vaultKVUsePrefix` value causing path mismatch (Critical)
**What was wrong:** The token auth component YAML set `vaultKVUsePrefix: "true"`, but secrets were stored at `secret/db-credentials`. With `vaultKVUsePrefix: "true"` and the default `vaultKVPrefix` of `"dapr"`, Dapr would look for secrets at `secret/data/dapr/db-credentials`, which doesn't match where they were written (`secret/data/db-credentials`).

**What was changed:** Changed `vaultKVUsePrefix` to `"false"` in the token auth YAML. Added `vaultKVUsePrefix: "false"` to the new AppRole and Kubernetes YAML configs as well.

**Why:** With the default prefix "dapr", the secret lookup path would not match the storage path, causing "secret not found" errors.

### 3. Incorrect explanation of `vaultKVUsePrefix` (Moderate)
**What was wrong:** The Nested Secret Paths section stated: "Set `vaultKVUsePrefix: "true"` in the component to prepend `data/` automatically for KV v2." This is incorrect — `vaultKVUsePrefix` controls whether the `vaultKVPrefix` (default "dapr") is prepended to the secret name, not the `data/` segment. The `data/` segment is part of the Vault KV v2 API and is handled internally by the component regardless of this setting.

**What was changed:** Corrected the explanation to accurately describe that `vaultKVUsePrefix` controls the `vaultKVPrefix` prepending behavior, and changed the recommended value to `"false"` to match the examples in the post.

**Why:** The original explanation would mislead readers about what the setting does, potentially causing path resolution issues.

### 4. Description updated (Minor)
**What was wrong:** The description stated the component reads secrets "using token, AppRole, or Kubernetes authentication methods," implying native support for all three.

**What was changed:** Updated to clarify that the Dapr component uses token-based authentication, with tokens obtained via these methods.

**Why:** Accuracy — the Dapr component's authentication is always token-based.

## Review Notes
- The Vault CLI commands in Step 1 (secrets engine setup) and Step 2 (auth method setup) are all correct. These are standard Vault operations independent of Dapr.
- The Go SDK and Python SDK code examples are correct and use current API signatures.
- The HTTP API path `GET /v1.0/secrets/vault/db-credentials` is correct per the Dapr Secrets API specification.
- The Vault policy using `secret/data/` paths is correct for KV v2 (the `data/` prefix is required in policies for KV v2).
- The Mermaid architecture diagram still shows AppRole and Kubernetes auth as options, which is technically accurate from Vault's perspective — these are valid Vault auth methods used to obtain tokens. The diagram could be clarified in a future update to show that Dapr receives tokens rather than performing auth directly.
- Future Dapr versions may add native support for additional auth methods. Readers should check the latest Dapr documentation for updates.
