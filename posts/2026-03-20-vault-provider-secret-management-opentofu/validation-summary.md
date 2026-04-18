# Validation Summary: How to Use the Vault Provider for Secret Management in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL configuration language)
- HashiCorp Vault (v4.x provider `hashicorp/vault`)
- Vault KV v2 secrets engine
- Vault database secrets engine (PostgreSQL)
- Vault AWS secrets engine
- Vault policies and ACL
- Vault Kubernetes auth method
- AWS SSM Parameter Store (for cross-provider example)

## Sources Consulted
- HashiCorp Vault Terraform/OpenTofu provider docs: https://registry.terraform.io/providers/hashicorp/vault/latest/docs
  - `vault_mount` resource
  - `vault_kv_secret_v2` resource and data source
  - `vault_database_secret_backend_connection` resource
  - `vault_database_secret_backend_role` resource
  - `vault_policy` resource
  - `vault_auth_backend` resource
  - `vault_kubernetes_auth_backend_config` resource
  - `vault_kubernetes_auth_backend_role` resource
- HashiCorp Vault documentation on KV v2 secrets engine, database secrets engine, and Kubernetes auth method

## Issues Found
1. **Incorrect TTL type in `vault_database_secret_backend_role`**: The post originally used `default_ttl = "1h"` and `max_ttl = "24h"` (duration strings). Per the official provider schema, `default_ttl` and `max_ttl` for this resource are integer seconds, not duration strings. Using string duration values would result in a type error during `tofu plan`.
   - **Fix applied**: Changed `default_ttl = "1h"` to `default_ttl = 3600` and `max_ttl = "24h"` to `max_ttl = 86400`.

## Review Notes
- All other resource arguments (`vault_mount`, `vault_kv_secret_v2`, `vault_database_secret_backend_connection`, `vault_policy`, `vault_auth_backend`, `vault_kubernetes_auth_backend_config`, `vault_kubernetes_auth_backend_role`) and their fields match the current provider schema for `hashicorp/vault ~> 4.0`.
- The `custom_metadata` block on `vault_kv_secret_v2` with `max_versions` and `data` is valid; other supported sub-fields include `cas_required` and `delete_version_after` if needed.
- Note: `vault_mount` exposes TTL fields as `default_lease_ttl_seconds` / `max_lease_ttl_seconds` (integer seconds), while `vault_auth_backend`'s `tune` block uses duration-string fields (`default_lease_ttl`, `max_lease_ttl`). The post does not use these but readers extending the examples should be aware of the inconsistency.
- The `cas = 1` on `vault_kv_secret_v2` is valid syntax but only applies cleanly when the target secret version is known ahead of time (e.g., updating an existing v1 secret or when `cas_required` is set on the mount). For brand-new managed secrets, omitting `cas` or setting it to `0` is often more appropriate — but this depends on the author's intended workflow and isn't technically incorrect.
- The policy example uses `secret/data/prod/*` which is correct for KV v2 (data is accessed via the `/data/` path prefix).
