# Validation Summary: How to Configure Vault Provider with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HashiCorp Vault
- Vault Terraform/OpenTofu Provider (`hashicorp/vault`)
- HCL (HashiCorp Configuration Language)

## Sources Consulted
- [Vault Provider - hashicorp - Terraform Registry](https://registry.terraform.io/providers/hashicorp/vault/latest/docs)
- [vault_mount | Resources | hashicorp/vault | Terraform Registry](https://registry.terraform.io/providers/hashicorp/vault/latest/docs/resources/mount)
- [vault_kv_secret_v2 / vault_generic_secret resources](https://registry.terraform.io/providers/hashicorp/vault/latest/docs/resources/generic_secret)
- [Learn to use the Terraform Vault provider | HashiCorp Developer](https://developer.hashicorp.com/vault/tutorials/get-started/learn-terraform)
- [GitHub - hashicorp/terraform-provider-vault](https://github.com/hashicorp/terraform-provider-vault)
- [OpenTofu documentation](https://opentofu.org/docs/)

## Issues Found
The post's title and introduction claim to cover the Vault provider for OpenTofu, but the original body used generic placeholder content (`provider_name`, `provider-namespace/provider-name`, `PROVIDER_API_KEY`, `PROVIDER_API_SECRET`, `provider_example_resource`) that did not configure the Vault provider at all. The provider source, environment variables, provider block, and example resource were all wrong for Vault. I made the following targeted fixes:

- **Provider Installation block:** Replaced the placeholder `provider_name` / `provider-namespace/provider-name` with the actual Vault provider declaration: `vault = { source = "hashicorp/vault", version = "~> 4.0" }`. Version `~> 4.0` matches the current major release line of `terraform-provider-vault`.
- **Authentication section:** Replaced `PROVIDER_API_KEY` / `PROVIDER_API_SECRET` with the correct Vault environment variables `VAULT_ADDR` (Vault server URL) and `VAULT_TOKEN` (auth token), per the official provider docs. The provider block is now `provider "vault"` with a comment noting that `address`/`token` are read from `VAULT_ADDR`/`VAULT_TOKEN`.
- **Example Resource section:** Replaced the fictional `provider_example_resource` with two real Vault resources: `vault_mount` (enabling a KV v2 secrets engine, using the documented `path`, `type = "kv"`, and `options = { version = "2" }`) and `vault_kv_secret_v2` (writing a secret using `mount`, `name`, and `data_json`). These match the official `hashicorp/vault` resource schemas.
- **Outputs section:** Updated the output to reference the new `vault_mount.kv.path` attribute instead of the fictional resource ID.

## Review Notes
- The HashiCorp Vault provider is published under `hashicorp/vault` and works with OpenTofu the same way it works with Terraform. As of 2026, the 4.x major version line is current.
- For production, prefer one of the auth methods (AppRole, AWS IAM, Kubernetes, etc.) over a long-lived `VAULT_TOKEN`. The post does not cover this, but it is a reasonable simplification for an introductory guide.
- `vault_kv_secret_v2` is the recommended resource for KV v2 mounts; the older `vault_generic_secret` still works but requires the raw API path and is more error-prone.
- The `required_version = ">= 1.6.0"` constraint is appropriate for OpenTofu (1.6.0 was OpenTofu's first GA release in January 2024).
- Best Practices section was left unchanged — its guidance (env vars/secrets manager for credentials, pinning versions, committing the lock file, per-environment provider configurations) is accurate for OpenTofu and the Vault provider.
