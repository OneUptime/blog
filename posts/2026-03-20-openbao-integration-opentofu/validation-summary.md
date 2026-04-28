# Validation Summary: How to Integrate OpenBao with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenBao (open-source fork of HashiCorp Vault)
- OpenTofu
- Terraform `hashicorp/vault` provider (v4.x)
- Vault KV v2 secrets engine
- Vault AppRole authentication backend
- Vault PKI secrets engine
- Docker (for running OpenBao in dev mode)
- AWS SSM Parameter Store (used as a downstream example)

## Sources Consulted
- OpenBao official documentation (https://openbao.org/docs/)
- OpenBao container image registries (Docker Hub, Quay.io, GitHub Container Registry)
- HashiCorp Vault provider for Terraform/OpenTofu (https://registry.terraform.io/providers/hashicorp/vault/latest/docs)
- Resource references for `vault_mount`, `vault_kv_secret_v2`, `vault_auth_backend`, `vault_approle_auth_backend_role`, `vault_approle_auth_backend_role_id`, `vault_pki_secret_backend_role`, `vault_pki_secret_backend_cert`
- HashiCorp BSL license change announcement (August 2023) and OpenBao fork history (Linux Foundation project)

## Issues Found
1. **Pre-existing fix in working tree**: The PKI section was missing the `vault_pki_secret_backend_role` resource definition, and the certificate issuance was incorrectly using `data "vault_pki_secret_backend_cert"` instead of `resource "vault_pki_secret_backend_cert"`. The role resource has been added and the data source changed to a resource (already staged in the working tree before review).
2. **Env var inconsistency in Docker example**: The dev container example used `VAULT_DEV_ROOT_TOKEN_ID` while the rest of the post uses native OpenBao env vars (`BAO_ADDR`, `BAO_TOKEN`). Although OpenBao retains some Vault env var compatibility, the canonical OpenBao variable is `BAO_DEV_ROOT_TOKEN_ID`. Changed `-e VAULT_DEV_ROOT_TOKEN_ID=root` to `-e BAO_DEV_ROOT_TOKEN_ID=root` for correctness and consistency.

## Review Notes
- The post leverages OpenBao's API compatibility with Vault by using the `hashicorp/vault` Terraform provider. This is correct, but readers should note that an `openbao/openbao` Terraform provider also exists and may be preferred for new projects that want to avoid the `hashicorp/` namespace entirely.
- The dev-mode Docker example is not for production use, which the post correctly notes.
- The `token_ttl = 3600` value on the AppRole role is in seconds; this is correct (the comment "1 hour" matches).
- All Terraform resource and data source schemas verified against the v4.x `hashicorp/vault` provider.
