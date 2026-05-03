# Validation Summary: How to Create Vault Secrets Engines with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform
- HashiCorp Vault
- HashiCorp Vault Terraform Provider (`hashicorp/vault`)
- Vault KV v2 Secrets Engine
- Vault PKI Secrets Engine (Root CA, Intermediate CA, Roles)
- Vault SSH Secrets Engine (CA mode)
- Vault TOTP Secrets Engine
- Vault Cubbyhole
- HCL (HashiCorp Configuration Language)

## Sources Consulted
- HashiCorp Vault Terraform Provider source on GitHub (`hashicorp/terraform-provider-vault`):
  - `vault/resource_mount.go` — confirms `default_lease_ttl_seconds` and `max_lease_ttl_seconds` are `TypeInt` (seconds)
  - `vault/resource_kv_secret_backend_v2.go` — confirms `delete_version_after` is `TypeInt` (seconds)
  - `vault/resource_pki_secret_backend_role.go` — confirms `ttl`/`max_ttl` are `TypeString` (duration string), `key_bits` is `TypeInt`, `server_flag`/`client_flag` are `TypeBool`, `allowed_domains` is `TypeList`, `allow_subdomains` is `TypeBool`
  - `vault/resource_ssh_secret_backend_role.go` — confirms `ttl`/`max_ttl` are `TypeString`, `default_extensions` is `TypeMap`, `allowed_extensions`/`allowed_users`/`default_user`/`key_type` are `TypeString`
- Terraform Registry docs for `hashicorp/vault` resources: `vault_mount`, `vault_kv_secret_backend_v2`, `vault_pki_secret_backend_root_cert`, `vault_pki_secret_backend_intermediate_cert_request`, `vault_pki_secret_backend_root_sign_intermediate`, `vault_pki_secret_backend_role`, `vault_ssh_secret_backend_ca`, `vault_ssh_secret_backend_role`

## Issues Found

1. **`delete_version_after` had wrong value type and unit.** The original code used `delete_version_after = "768h"  # 32 days`. The Vault Terraform provider defines this attribute as `TypeInt` (integer seconds), not a duration string. Changed to `delete_version_after = 2764800  # 32 days (in seconds)` (32 × 24 × 3600 = 2,764,800).

2. **`max_lease_ttl_seconds` (PKI root mount) used hours value in a seconds field.** The original `max_lease_ttl_seconds = 87600    # ~10 years` is incorrect — 87,600 seconds is ~24.3 hours, not 10 years. The author confused hours with seconds (87,600 *hours* ≈ 10 years). Fixed to `max_lease_ttl_seconds = 315360000  # ~10 years` (10 × 365 × 24 × 3600 = 315,360,000 seconds).

3. **`max_lease_ttl_seconds` (PKI intermediate mount) had the same hours/seconds confusion.** The original `max_lease_ttl_seconds = 43800    # 5 years` is incorrect — 43,800 seconds is ~12.2 hours. Fixed to `max_lease_ttl_seconds = 157680000  # 5 years` (5 × 365 × 24 × 3600 = 157,680,000 seconds).

## Review Notes

- The PKI cert TTLs (`ttl = "87600h"` for root, `ttl = "43800h"` for the intermediate sign, `max_ttl = "720h"` for the role) are correct because those resources accept string duration values with units; the units are explicit (`h`).
- The SSH role uses unquoted `permit-pty` as a map key in `default_extensions = { permit-pty = "" }`. Terraform's HCL2 parser accepts dashed identifiers as object/map keys in this position, so the snippet is syntactically valid.
- `vault_ssh_secret_backend_ca` defaults `generate_signing_key` to `true`; setting it explicitly is fine and harmless.
- The Description in the front matter mentions a "database" engine, but the post does not contain a `vault_database_secrets_mount`/role example. This is a minor scope mismatch — the `Organizing Multiple Engines` section does include a `database` mount type — but a fuller worked example was not in scope. Left unchanged because it would require adding new content.
- The Cubbyhole section uses an HCL code block that contains only comments, which is unusual but not technically wrong. Left unchanged to preserve the author's structure.
- For production use, RSA 2048 in `vault_pki_secret_backend_role.web_server` is acceptable but operators may want ECDSA (`key_type = "ec"`, `key_bits = 256`) for shorter, faster certificates; this is a recommendation rather than a correction.
