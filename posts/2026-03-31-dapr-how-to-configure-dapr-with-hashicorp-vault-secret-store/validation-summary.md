# Validation Summary: How to Configure Dapr with HashiCorp Vault Secret Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (secret store building block, secret scoping, HTTP API, Go SDK, Java SDK)
- HashiCorp Vault (KV v2 secrets engine, policies, token auth, Kubernetes auth)
- Kubernetes (service accounts, Vault Agent sidecar pattern)
- Go (Dapr Go SDK)
- Java (Dapr Java SDK)

## Sources Consulted
- [Dapr HashiCorp Vault Secret Store Component Reference](https://docs.dapr.io/reference/components-reference/supported-secret-stores/hashicorp-vault/) — verified all metadata field names, types, defaults, and supported authentication methods
- [Dapr Secrets API Reference](https://docs.dapr.io/reference/api/secrets_api/) — confirmed HTTP API endpoint format `/v1.0/secrets/{storeName}/{key}`
- [Dapr Component Secrets Reference](https://docs.dapr.io/operations/components/component-secrets/) — verified `secretKeyRef` format and `auth.secretStore` placement in component YAML
- [Dapr Secret Scoping Configuration](https://docs.dapr.io/operations/configuration/secret-scope/) — verified Configuration YAML format with `spec.secrets.scopes`
- [HashiCorp Vault Kubernetes Auth Method](https://developer.hashicorp.com/vault/docs/auth/kubernetes) — verified Vault-side Kubernetes auth setup commands

## Issues Found

### Issue 1: `vaultKVUsePrefix` set to `"true"` without specifying `vaultKVPrefix`
- **What was wrong:** Both component YAML examples set `vaultKVUsePrefix: "true"` but did not specify `vaultKVPrefix`. The default value of `vaultKVPrefix` is `"dapr"`, which means Dapr would look for secrets at `secret/data/dapr/myapp` instead of `secret/data/myapp` where they were actually stored in Step 1.
- **What was changed:** Set `vaultKVUsePrefix` to `"false"` in both component definitions.
- **Why:** Without a prefix, the secret paths in Dapr match the Vault paths used in the tutorial (`secret/myapp`). Setting `vaultKVUsePrefix` to `"false"` forces the prefix to empty, which aligns with how secrets are stored and how the Vault policy is configured.

### Issue 2: `vaultKubernetesRole` is not a valid Dapr component metadata field
- **What was wrong:** The Kubernetes Auth component YAML used a `vaultKubernetesRole` metadata field that does not exist in the Dapr HashiCorp Vault component. The component only supports `vaultToken` and `vaultTokenMountPath` for authentication — there is no native Kubernetes auth integration.
- **What was changed:** Replaced the Kubernetes Auth component YAML to use `vaultTokenMountPath` pointing to `/tmp/vault/.vault-token`, and added a note explaining that Vault Agent sidecar is needed to handle Kubernetes auth and write the token file.
- **Why:** The official Dapr documentation explicitly lists only `vaultToken` and `vaultTokenMountPath` as authentication methods. Kubernetes auth requires an external mechanism (Vault Agent sidecar) to obtain a Vault token and write it to a file for Dapr to consume.

## Review Notes
- The Vault CLI commands (secrets engine setup, policy creation, token creation, Kubernetes auth configuration) are all correct.
- The Go SDK code correctly uses `dapr.NewClient()` and `client.GetSecret(ctx, storeName, key, meta)`.
- The Java SDK code correctly uses `DaprClientBuilder().build()` and `client.getSecret(storeName, key).block()`.
- The `secretKeyRef` format and `auth.secretStore` placement in the redis component YAML are correct per Dapr documentation.
- The secret scoping Configuration YAML matches the official Dapr format.
- The Step 3 Vault-side Kubernetes auth setup remains valid — it configures Vault itself, not the Dapr component. The Vault Agent sidecar uses this configuration to authenticate.
