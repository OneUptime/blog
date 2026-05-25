# Validation Summary: How to Configure HashiCorp Vault Provider in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp Vault
- Terraform Vault provider
- Vault KV v2 secrets engine
- Vault AppRole and AWS IAM authentication
- Vault policies
- Vault PKI secrets engine
- Terraform S3 backend

## Sources Consulted
- HashiCorp Terraform Registry: Vault provider overview, latest provider version and installation snippet: https://registry.terraform.io/providers/hashicorp/vault
- HashiCorp Terraform Registry: `vault_mount` resource: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/resources/mount
- HashiCorp Terraform Registry: `vault_kv_secret_v2` resource and data source: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/resources/kv_secret_v2 and https://registry.terraform.io/providers/hashicorp/vault/latest/docs/data-sources/kv_secret_v2
- HashiCorp Terraform Registry: `vault_approle_auth_backend_role` resource: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/resources/approle_auth_backend_role
- HashiCorp Terraform Registry: `vault_pki_secret_backend_role` resource: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/resources/pki_secret_backend_role
- HashiCorp Developer: Terraform provider configuration and aliases: https://developer.hashicorp.com/terraform/language/providers/configuration
- HashiCorp Developer: Terraform S3 backend: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Developer: Vault CLI environment variables: https://developer.hashicorp.com/vault/docs/commands
- HashiCorp Developer: Vault KV v2 API and policy paths: https://developer.hashicorp.com/vault/api-docs/secret/kv/kv-v2
- HashiCorp Developer: Vault AWS auth method: https://developer.hashicorp.com/vault/docs/auth/aws
- HashiCorp Developer: Vault AppRole auth method: https://developer.hashicorp.com/vault/docs/auth/approle

## Issues Found
- The provider version constraint used `~> 3.25`, which is outdated for a new 2026 tutorial. Updated it to `~> 5.9` to match the current Vault provider major version.
- The Terraform prerequisite and `required_version` used `>= 1.0`, but the updated S3 backend example uses native S3 lockfiles. Updated both to `>= 1.10`.
- The environment variable example used `VAULT_SKIP_TLS_VERIFY`, but the Vault client/provider uses `VAULT_SKIP_VERIFY`. Updated the variable name.
- The KV v2 policy granted `list` on `secret/data/database/*`. KV v2 list operations use the `metadata` path, so the policy now grants `read` on `secret/data/database/*` and `list` on `secret/metadata/database/*`.
- The PKI role example used `max_ttl = "72h"`, but the Terraform provider documents `max_ttl` as seconds. Updated it to `259200`.
- The S3 backend example used `dynamodb_table`, which is deprecated for S3 backend locking in current Terraform documentation. Updated it to `use_lockfile = true`.

## Review Notes
Terraform CLI was not installed in the local environment, so examples were reviewed against official HashiCorp documentation rather than validated with `terraform validate`.
