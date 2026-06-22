# Validation Summary: How to Install and Configure HashiCorp Vault on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation and configuration guide

## Technologies Covered
- HashiCorp Vault (secrets management)
- Ubuntu (apt package management, systemd)
- TLS / OpenSSL
- KV v2, Database, Transit, and PKI secrets engines
- UserPass, AppRole, and Kubernetes authentication methods
- Raft (integrated storage) and Consul storage backends
- AWS KMS auto-unseal
- Prometheus telemetry

## Sources Consulted
- HashiCorp Vault official install docs (Linux/apt): https://developer.hashicorp.com/vault/install
- Vault systemd / production hardening guide: https://developer.hashicorp.com/vault/tutorials/get-started/setup
- Vault configuration reference (listener, storage, telemetry, seal): https://developer.hashicorp.com/vault/docs/configuration
- KV v2 secrets engine: https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2
- Database secrets engine (PostgreSQL): https://developer.hashicorp.com/vault/docs/secrets/databases/postgresql
- Transit secrets engine: https://developer.hashicorp.com/vault/docs/secrets/transit
- PKI secrets engine: https://developer.hashicorp.com/vault/docs/secrets/pki
- AppRole / Kubernetes auth methods: https://developer.hashicorp.com/vault/docs/auth
- Raft integrated storage & operator raft join: https://developer.hashicorp.com/vault/docs/concepts/integrated-storage
- System backend metrics endpoint (/sys/metrics): https://developer.hashicorp.com/vault/api-docs/system/metrics

## Issues Found
- **Monitoring metrics endpoint missing authentication.** The original `curl https://vault.example.com:8200/v1/sys/metrics?format=prometheus` would return HTTP 403 by default. The `/sys/metrics` endpoint is an authenticated endpoint unless `unauthenticated_metrics_access = true` is set in the listener's `telemetry` block. Updated the command to include `-H "X-Vault-Token: $VAULT_TOKEN"` and quoted the URL so the `?format=prometheus` query string is not misinterpreted by the shell. Also clarified in the comment that the endpoint requires authentication by default.

## Review Notes
- The APT repository setup (GPG key dearmor, signed-by keyring, `lsb_release -cs`) matches the current official HashiCorp install procedure.
- The systemd unit file matches HashiCorp's recommended hardened service definition (CAP_IPC_LOCK ambient capability, `LimitMEMLOCK=infinity`, `mlock` support, SIGINT kill signal).
- Config stanzas (`storage`, `listener`, `api_addr`, `cluster_addr`, `telemetry`, `seal "awskms"`, `storage "raft"`) use correct field names and value types. `tls_disable = "false"` as a quoted string is valid HCL.
- All CLI commands (`vault operator init/unseal`, `vault kv put/get/list/delete`, `vault kv metadata delete`, `vault secrets enable`, `vault write database/...`, `vault policy write`, `vault auth enable`, `vault write -f transit/keys/...`, `vault write pki/...`, `vault audit enable`, `vault operator raft join/list-peers`) use correct, current syntax and flags.
- The KV v2 policy correctly uses the `secret/data/myapp/*` path prefix (data plane path for KV v2), which is a common point of confusion and was handled correctly.
- Minor (not changed — illustrative only): the policy example `path "auth/token/root" { capabilities = ["deny"] }` is a didactic illustration; `auth/token/root` is not a real protected API path (root token generation is done via `sys/generate-root`). It is harmless as a deny example but does not protect a real endpoint.
- Minor caveat (not changed): the dev-mode `VAULT_TOKEN='hvs.xxxxxxxxxxxxx'` is a placeholder; the actual root token is printed in the `vault server -dev` output, which the comment already notes.
