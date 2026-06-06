# Validation Summary: How to Use Vault with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault (KV v2, Database, AppRole, PKI engines)
- Terraform (HCL, providers, data sources, resources)
- Terraform Vault provider (hashicorp/vault)
- Terraform AWS provider (hashicorp/aws)
- AWS RDS (PostgreSQL), EC2, Security Groups, Key Pairs, S3 backend
- Kubernetes (kubernetes_secret resource)
- PostgreSQL (dynamic credentials via Vault)
- Mermaid diagrams

## Sources Consulted
- [HashiCorp Vault Terraform Provider docs (Terraform Registry)](https://registry.terraform.io/providers/hashicorp/vault/latest/docs)
- [hashicorp/terraform-provider-vault GitHub repo — data source documentation directory](https://github.com/hashicorp/terraform-provider-vault/tree/main/website/docs/d)
- [Inject secrets into Terraform using the Vault provider (HashiCorp Developer)](https://developer.hashicorp.com/terraform/tutorials/secrets/secrets-vault)
- [Dynamic Secrets with Terraform and Vault (HashiCorp Solutions Engineering Blog)](https://medium.com/hashicorp-engineering/dynamic-secrets-with-terraform-and-vault-14c563d79f8e)
- HashiCorp Vault CLI command reference (vault server, vault secrets enable, vault auth enable, vault write, vault kv put, vault policy)
- AWS provider resource references (aws_db_instance, aws_instance, aws_key_pair, aws_security_group)

## Issues Found
1. **Non-existent `vault_database_secret` data source** in the "Using Dynamic Credentials in Terraform" section. The hashicorp/vault Terraform provider does not expose a `vault_database_secret` data source. The standard, documented way to retrieve dynamic database credentials in Terraform is to use the `vault_generic_secret` data source against the `database/creds/<role>` path. Fixed by replacing the `data "vault_database_secret" "app_db"` block with `data "vault_generic_secret" "app_db"` pointing at `path = "database/creds/app-readwrite"`, and updating all attribute references from `.username` / `.password` to `.data["username"]` / `.data["password"]`. The `.lease_duration` attribute is preserved because `vault_generic_secret` exposes it identically.

## Review Notes
- The Vault provider version pin `~> 3.0` is older than the current 4.x line, but 3.x is still a valid, released major version, so this is not technically incorrect. Authors may want to consider moving to `~> 4.0` in future revisions.
- The `skip_child_token = true` provider option is a real argument and is reasonable for long-running operations, but the inline comment "Terraform will automatically renew the token before it expires" oversells what the option does — it merely prevents the provider from creating a short-lived child token from the parent auth token. The comment is somewhat misleading but not technically wrong enough to block validation.
- The PostgreSQL `engine_version = "15.4"` is a real, valid AWS RDS PostgreSQL minor version and is fine; readers running this much later may want to use a more recent supported version.
- The `aws_db_instance` arguments (`identifier`, `engine`, `engine_version`, `instance_class`, `allocated_storage`, `max_allocated_storage`, `storage_encrypted`, `db_name`, `username`, `password`, `vpc_security_group_ids`, `db_subnet_group_name`, `backup_retention_period`, `skip_final_snapshot`) are all valid AWS provider arguments.
- The Vault CLI commands (`vault server -dev -dev-root-token-id`, `vault secrets enable -version=2 -path=secret kv`, `vault kv put`, `vault auth enable approle`, `vault write auth/approle/role/...`, `vault read auth/approle/role/.../role-id`, `vault write -f auth/approle/.../secret-id`, `vault write database/config/...`, `vault write database/roles/...`, `vault token lookup`, `vault policy read`, `vault kv get`) are all correct.
- The `vault_approle_auth_backend_role`, `vault_mount`, `vault_policy`, and `vault_kv_secret_v2` resource argument shapes match the official provider documentation.
- The `auth_login` block for AppRole authentication in the `provider "vault"` configuration uses the correct `path` and `parameters` keys.
- KV v2 read path explanation (`secret/database` → `secret/data/database` internally) is accurate.
- All Mermaid diagrams render syntactically valid Mermaid.
