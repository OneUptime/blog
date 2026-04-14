# Validation Summary: How to Use Dapr with HashiCorp Vault Auth Methods

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (secret store component)
- HashiCorp Vault (KV v2 secret engine)
- HashiCorp Vault Kubernetes auth method
- HashiCorp Vault AppRole auth method
- Vault Agent Injector for Kubernetes
- Python Dapr SDK
- Kubernetes

## Sources Consulted
- [Dapr HashiCorp Vault Secret Store Component Reference](https://docs.dapr.io/reference/components-reference/supported-secret-stores/hashicorp-vault/) — verified all supported metadata field names
- [Dapr components-contrib Vault source code (vault.go)](https://github.com/dapr/components-contrib/blob/main/secretstores/hashicorp/vault/vault.go) — confirmed only token-based auth is implemented
- [Vault Agent Injector Annotations](https://developer.hashicorp.com/vault/docs/platform/k8s/injector/annotations) — verified agent-inject-token annotation and `/vault/secrets/token` path
- [Vault Kubernetes Auth Method](https://developer.hashicorp.com/vault/docs/auth/kubernetes) — verified Vault CLI commands for Kubernetes auth setup
- [Vault AppRole Auth Method](https://developer.hashicorp.com/vault/docs/auth/approle) — verified Vault CLI commands for AppRole setup

## Issues Found

### Issue 1: Dapr Vault component does not support Kubernetes auth natively
- **What was wrong:** The post presented Dapr's Vault component as having native Kubernetes auth support via `auth: "kubernetes"` and `vaultKubernetesRole` metadata fields. These fields do not exist in the Dapr Vault component. The `vaultTokenMountPath` was pointed at the Kubernetes service account token (`/var/run/secrets/kubernetes.io/serviceaccount/token`), but this field expects a Vault token, not a Kubernetes SA token.
- **What was changed:** Replaced the Dapr component YAML with the correct pattern: use the Vault Agent Injector (via pod annotations) to handle Kubernetes auth and write a Vault token to `/vault/secrets/token`, then configure Dapr's `vaultTokenMountPath` to read from that path. Removed the non-existent `auth` and `vaultKubernetesRole` fields.
- **Why:** Dapr's Vault secret store component only supports token-based authentication (`vaultToken` or `vaultTokenMountPath`). The Vault Agent Injector is the standard pattern for bridging Kubernetes auth to token auth for Dapr.

### Issue 2: Dapr Vault component does not support AppRole auth natively
- **What was wrong:** The post used `vaultRoleID` and `vaultRoleSecretID` metadata fields in the Dapr component YAML. These fields do not exist in the Dapr Vault component.
- **What was changed:** Replaced with the correct approach: authenticate with AppRole externally (via Vault CLI, Vault Agent, or init container), store the resulting Vault token in a Kubernetes secret, and reference it via `vaultToken` with `secretKeyRef`. Added a bash example showing how to authenticate with AppRole and create the Kubernetes secret.
- **Why:** The Dapr Vault component only accepts pre-authenticated Vault tokens. AppRole authentication must happen outside of Dapr.

### Issue 3: Inconsistent vaultAddr protocol with TLS settings
- **What was wrong:** The Kubernetes auth section used `http://vault.vault-system.svc.cluster.local:8200` for `vaultAddr` while also setting `skipVerify: "false"` and `tlsServerName`. TLS settings are irrelevant for HTTP connections.
- **What was changed:** Changed `http://` to `https://` to be consistent with the TLS verification settings.
- **Why:** If TLS server name verification and skip-verify are configured, the connection should use HTTPS.

### Issue 4: Incorrect summary claims
- **What was wrong:** The summary stated "Dapr presents the pod's service account token to Vault for verification" and described storing "RoleID and SecretID as Kubernetes secrets" for AppRole.
- **What was changed:** Updated to accurately describe that Dapr uses token-based auth, the Vault Agent Injector handles Kubernetes auth, and AppRole authentication happens externally with the resulting token provided to Dapr.
- **Why:** The summary needs to reflect the actual architecture and mechanism.

## Review Notes
- The Vault CLI commands for setting up Kubernetes auth and AppRole are all correct — the errors were exclusively in the Dapr component configuration and the description of how Dapr interacts with Vault.
- The Python Dapr SDK code (`client.get_secret()` and `secret.secret[]`) is correct.
- The Dapr HTTP secrets API curl command (`/v1.0/secrets/{store}/{key}`) is correct.
- The `vaultKVPrefix: "myapp"` value correctly aligns with the Vault policy path `secret/data/myapp/*`.
- For production use with AppRole, the manual token creation approach shown should be replaced with an automated solution (Vault Agent or an operator) to handle token renewal before TTL expiry.
