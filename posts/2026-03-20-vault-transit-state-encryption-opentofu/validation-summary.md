# Validation Summary: How to Use Vault Transit for State Encryption in OpenTofu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenTofu 1.7+ native state encryption
- HashiCorp Vault Transit secrets engine
- Terraform Vault provider (`vault_mount`, `vault_transit_secret_backend_key`, `vault_policy`)
- S3 backend for state storage
- AWS CLI / Vault CLI

## Sources Consulted
- OpenTofu State and Plan Encryption docs: https://opentofu.org/docs/language/state/encryption/
- OpenTofu 1.7.0 release announcement: https://opentofu.org/blog/opentofu-1-7-0/
- HashiCorp Vault Transit secrets engine docs: https://developer.hashicorp.com/vault/docs/secrets/transit
- Terraform Vault provider `vault_transit_secret_backend_key` resource: https://github.com/hashicorp/terraform-provider-vault/blob/main/website/docs/r/transit_secret_backend_key.html.md

## Issues Found

1. **Incorrect encryption block names `statefile` / `planfile`.** The OpenTofu encryption block uses `state` and `plan`, not `statefile` / `planfile`. Fixed in both the PBKDF2 fallback example and the Vault-backed example.

2. **Non-existent `vault` key provider.** OpenTofu has no built-in `key_provider "vault"`. The built-in providers are `pbkdf2`, `aws_kms`, `gcp_kms`, `openbao`, and the experimental `external` provider. The closest match for Vault Transit is `openbao`, which is compatible with the last MPL-licensed release of HashiCorp Vault (1.14) and with OpenBao. Renamed the block to `key_provider "openbao"` and added a note about Vault 1.14 / OpenBao compatibility. Also updated the corresponding `key_provider.vault.transit_key` reference to `key_provider.openbao.transit_key`.

3. **Environment variables `VAULT_TOKEN` / `VAULT_ADDR` are not picked up by the `openbao` key provider.** That provider reads `BAO_TOKEN` and `BAO_ADDR`. Updated the example to obtain a token with the Vault CLI (which uses `VAULT_ADDR` / `VAULT_TOKEN`) and then export `BAO_ADDR` / `BAO_TOKEN` for OpenTofu to consume.

## Review Notes
- The Vault policy capabilities (`update` on encrypt/decrypt paths, `read` on the key path) are appropriate for using the Transit engine from OpenTofu.
- `auto_rotate_period = 2592000` and `min_decryption_version = 1` on `vault_transit_secret_backend_key` are valid (the former is an integer number of seconds, the latter is an integer key version).
- `vault write -f transit/keys/<name>/rotate` is the correct manual rotation command.
- `tofu apply -refresh-only` is a legitimate way to rewrite state after a key rotation, though callers should note that the state is only re-encrypted when it is actually written; any apply (or similar write operation) will achieve the same re-encryption.
- For BUSL-licensed HashiCorp Vault (1.15+), the built-in `openbao` provider is not supported; readers on newer Vault versions would need to either stay on Vault 1.14, migrate to OpenBao, or use the experimental `external` key provider to shell out to the Vault CLI. The post does not address this, but it is beyond the scope of corrections (stylistic/structural).
