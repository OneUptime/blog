# Validation Summary: How to Use Vault with Terraform for Automated Secret Provisioning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault
- Terraform
- Terraform Vault provider
- Terraform Kubernetes provider
- Vault KV v2 secrets engine
- Vault Database secrets engine
- Vault PKI secrets engine
- Vault Kubernetes auth method
- Vault Transit secrets engine
- Terraform remote state backends
- GitLab CI

## Sources Consulted
- HashiCorp Terraform Vault provider 5.x upgrade guide: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/guides/version_5_upgrade
- HashiCorp Terraform Vault provider `vault_kv_secret_v2` resource: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/resources/kv_secret_v2
- HashiCorp Terraform Vault provider `vault_database_secrets_mount` resource: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/resources/database_secrets_mount
- HashiCorp Terraform Vault provider `vault_kubernetes_auth_backend_config` resource: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/resources/kubernetes_auth_backend_config
- HashiCorp Terraform Vault provider `vault_kubernetes_auth_backend_role` resource: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/resources/kubernetes_auth_backend_role
- HashiCorp Terraform Vault provider `vault_pki_secret_backend_root_cert` resource: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/resources/pki_secret_backend_root_cert
- HashiCorp Terraform Vault provider `vault_transit_secret_backend_key` resource: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/resources/transit_secret_backend_key
- Vault KV v2 API documentation: https://developer.hashicorp.com/vault/api-docs/secret/kv/kv-v2
- Vault Kubernetes auth method documentation: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- Kubernetes service account administration documentation: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Terraform Kubernetes backend documentation: https://developer.hashicorp.com/terraform/language/backend/kubernetes
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Vault CLI `kv metadata` documentation: https://developer.hashicorp.com/vault/docs/commands/kv/metadata
- Vault CLI `kv list` documentation: https://developer.hashicorp.com/vault/docs/commands/kv/list
- Vault CLI `policy list` documentation: https://developer.hashicorp.com/vault/docs/commands/policy/list

## Issues Found
- The provider constraints used older Vault and Kubernetes provider versions and Terraform `>= 1.5.0`, while the corrected examples use Vault provider 5.x write-only attributes that require Terraform 1.11+. Updated the constraints to Terraform `>= 1.11.0`, Vault provider `~> 5.9`, and Kubernetes provider `~> 3.1`.
- The KV v2 mount example used the older `type = "kv-v2"` form. Updated it to the current documented `type = "kv"` with `options = { version = "2" }`.
- KV secret examples used `data_json`, which stores secret data in Terraform state. Updated them to `data_json_wo` with `data_json_wo_version`.
- The database secrets mount stored the PostgreSQL root password through `password`. Updated it to `password_wo` with `password_wo_version` and added the missing `postgres_vault_password` variable.
- KV v2 policies granted `list` on `secret/data/...`, but Vault requires list access on the KV v2 `metadata` path. Split read/write access on `secret/data/...` from list access on `secret/metadata/...`.
- The Kubernetes auth configuration attempted to read token data from `data.kubernetes_service_account.vault.secret[0].data`, which is not a valid way to access Secret data and also depends on legacy auto-generated service account token Secrets that Kubernetes 1.24+ no longer creates. Replaced it with explicit CA certificate and reviewer JWT variables and used the Vault provider write-only reviewer JWT argument.
- The S3 backend example used deprecated DynamoDB-based locking. Updated it to `use_lockfile = true` and changed the best-practices prose to reference S3 native lock files.
- The monitoring command listed Vault policies and grepped for `managed_by`, but the Terraform-managed metadata in the post is attached to KV secrets, not policies. Replaced it with a `vault kv metadata get` command that reads the KV custom metadata directly.

## Review Notes
Terraform CLI is not installed in this workspace, so I could not run `terraform fmt` or `terraform validate` locally. The snippets were reviewed against current official documentation instead.
