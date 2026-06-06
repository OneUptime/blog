# Validation Summary: How to Use Vault KV Secrets Engine

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault (KV Secrets Engine v1 and v2)
- Vault CLI (`vault kv`, `vault secrets`, `vault audit`, `vault policy`, `vault token`)
- Vault HTTP API (curl examples)
- Python `hvac` client library
- Go `github.com/hashicorp/vault/api` client (KVv2 helper)
- Node.js `node-vault` client
- HCL (Vault policy language)
- AppRole authentication method

## Sources Consulted
- Vault KV v2 API docs: https://developer.hashicorp.com/vault/api-docs/secret/kv/kv-v2
- Vault KV CLI commands: https://developer.hashicorp.com/vault/docs/commands/kv
- Vault audit devices (file, syslog): https://developer.hashicorp.com/vault/docs/audit/file and /audit/syslog
- hvac KV v2 usage: https://python-hvac.org/en/stable/usage/secrets_engines/kv_v2.html
- Vault Go API (pkg.go.dev): https://pkg.go.dev/github.com/hashicorp/vault/api
- node-vault npm package: https://www.npmjs.com/package/node-vault

## Issues Found
1. **Destroy endpoint HTTP verb (API section).** The curl example for permanently destroying versions used `-X POST`, but the official Vault KV v2 API reference specifies `PUT` for the destroy endpoint (delete and undelete remain POST). Updated the curl example to `-X PUT`.
2. **Missing `datetime` import in rotation example.** The `rotate_database_password` function in the "Best Practices > Implement Secret Rotation" section calls `datetime.utcnow().isoformat()` but never imports `datetime`. Added `from datetime import datetime` alongside the existing `import secrets` inside the function so the snippet runs as written.

## Review Notes
- All `vault kv` CLI flags used (`-version`, `-versions`, `-field`, `-format`, `-cas`, `-max-versions`, `-delete-version-after`, `-cas-required`) are correct and current.
- All hvac method names and parameter names (`create_or_update_secret`, `read_secret_version`, `list_secrets`, `delete_secret_versions`, `delete_latest_version_of_secret`, `undelete_secret_versions`, `destroy_secret_versions`, `read_secret_metadata`) match the current hvac API.
- Go API usage (`vault.DefaultConfig`, `vault.NewClient`, `client.KVv2`, `kv.Put/Get/GetVersion/GetMetadata/Delete/Undelete`, `VersionMetadata.Version`, `KVMetadata.CurrentVersion/OldestVersion`) is correct. Note: the Go `KVv2.Put` accepts variadic `KVOption` args (e.g., `WithCheckAndSet`) — the post does not demonstrate CAS in Go, so this is fine, but worth keeping in mind for a future expansion.
- node-vault constructor and `read`/`write`/`list` usage is correct; list correctly targets the `secret/metadata/<path>` path for KV v2.
- HCL policy paths (`secret/data/...`, `secret/metadata/...`, `secret/destroy/...`, `secret/undelete/...`) and capabilities are accurate.
- `datetime.utcnow()` is deprecated in Python 3.12+ in favor of `datetime.now(timezone.utc)`. The example still works on supported versions but a future revision could switch to the timezone-aware form.
- The AppRole example uses the legacy `policies=` parameter name; `token_policies=` is the canonical name in modern Vault but `policies` continues to be accepted as an alias, so this is not a bug.
