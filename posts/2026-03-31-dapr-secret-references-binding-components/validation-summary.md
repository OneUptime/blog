# Validation Summary: How to Use Secret References in Dapr Binding Components

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Secret Store API (Kubernetes, HashiCorp Vault, Local File)
- Dapr Binding Components (AWS S3, HTTP)
- Kubernetes Secrets and RBAC
- HashiCorp Vault (KV v2 engine)
- kubectl CLI
- Vault CLI

## Sources Consulted
- Dapr component secrets documentation: https://docs.dapr.io/operations/components/component-secrets/
- Dapr Kubernetes secret store reference: https://docs.dapr.io/reference/components-reference/supported-secret-stores/kubernetes-secret-store/
- Dapr HashiCorp Vault secret store reference: https://docs.dapr.io/reference/components-reference/supported-secret-stores/hashicorp-vault/
- Dapr AWS S3 binding reference: https://docs.dapr.io/reference/components-reference/supported-bindings/s3/
- Dapr HTTP binding reference: https://docs.dapr.io/reference/components-reference/supported-bindings/http/
- Dapr local file secret store reference: https://docs.dapr.io/reference/components-reference/supported-secret-stores/file-secret-store/

## Issues Found

1. **Removed non-existent `vaultKVVersion` metadata field from Vault component.** The Dapr HashiCorp Vault secret store component does not have a `vaultKVVersion` field. The KV engine version is determined by the Vault engine configuration itself, not by a Dapr metadata field. Removed the two lines (`name: vaultKVVersion` / `value: "v2"`).

2. **Fixed incorrect HTTP binding metadata field `authHeader` to `securityToken` and `securityTokenHeader`.** The Dapr HTTP binding component does not have an `authHeader` metadata field. The correct fields are `securityToken` (the token value) and `securityTokenHeader` (the header name to send it in). Changed to use `securityToken` with the existing secretKeyRef and added `securityTokenHeader` set to `"Authorization"`.

3. **Fixed Vault secretKeyRef name from `dapr/bindings/stripe` to `bindings/stripe`.** Dapr's Vault component auto-prepends the `vaultKVPrefix` (default: `"dapr"`) to the secret name when querying Vault. Using `dapr/bindings/stripe` as the secretKeyRef name would cause Dapr to look up `secret/dapr/dapr/bindings/stripe` in Vault, which is incorrect. The correct name is `bindings/stripe`, which resolves to the Vault path `secret/dapr/bindings/stripe`.

4. **Added missing `auth.secretStore: vault-store` to the Stripe HTTP binding component.** Dapr requires the `auth.secretStore` field to specify which secret store resolves `secretKeyRef` values. Without it, Dapr defaults to the Kubernetes secret store (when running on Kubernetes), which would fail to find Vault secrets. Added the `auth` section pointing to `vault-store`.

## Review Notes
- The S3 binding component omits the `auth.secretStore` field, which is technically correct on Kubernetes because Dapr auto-provisions a Kubernetes secret store and uses it as the default. However, explicitly adding `auth.secretStore: kubernetes` would improve clarity and portability.
- The blog defines a custom Kubernetes secret store component named `kubernetes-secrets`, but never references it via `auth.secretStore`. The S3 binding uses the auto-provisioned default. The custom definition is not harmful but is effectively unused.
- The Stripe HTTP binding example uses a secretKeyRef for the security token. The token value from Vault (`sk_live_XXX`) will be sent as-is in the `Authorization` header. If Stripe requires `Bearer` prefix (i.e., `Authorization: Bearer sk_live_XXX`), the stored secret value would need to include the `Bearer ` prefix.
- All Kubernetes RBAC configuration (Role/RoleBinding) is syntactically correct.
- The local file secret store configuration and JSON format are correct.
- The `kubectl create secret` command syntax is correct.
- The `vault kv put` command syntax is correct for Vault KV v2.
