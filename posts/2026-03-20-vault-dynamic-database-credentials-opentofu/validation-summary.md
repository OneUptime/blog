# Validation Summary: How to Generate Dynamic Database Credentials with Vault and OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault (database secrets engine)
- OpenTofu / Terraform (hashicorp/vault provider)
- PostgreSQL
- MySQL / Aurora MySQL
- AWS SSM Parameter Store
- AWS ECS Task Definitions

## Sources Consulted
- hashicorp/vault provider resource schema for `vault_database_secret_backend_role`: https://github.com/hashicorp/terraform-provider-vault/blob/main/vault/resource_database_secret_backend_role.go
- hashicorp/vault provider resource schema for `vault_database_secret_backend_connection`: https://github.com/hashicorp/terraform-provider-vault/blob/main/vault/resource_database_secret_backend_connection.go
- Provider registration (data source/resource list): https://github.com/hashicorp/terraform-provider-vault/blob/main/vault/provider.go
- Terraform Registry docs: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/resources/database_secret_backend_role
- Terraform Registry docs: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/resources/database_secret_backend_connection
- Terraform Registry docs: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/data-sources/generic_secret
- Vault database secrets engine docs: https://developer.hashicorp.com/vault/docs/secrets/databases

## Issues Found

1. **Non-existent data source `vault_database_secret_backend_creds`.** The post used `data "vault_database_secret_backend_creds"` to read dynamic credentials, but this data source does not exist in the hashicorp/vault provider. Verified by inspecting `vault/provider.go` (the string does not appear anywhere in the registered data sources). The provider registers dedicated creds data sources for AWS, Azure, LDAP, AD, Nomad, Kubernetes, etc., but not for the database engine. Fixed by switching both usages to `data "vault_generic_secret"` pointing at the `<mount>/creds/<role>` path, which is the documented Terraform-native pattern for dynamic DB creds. Updated interpolations to use `.data["username"]` / `.data["password"]` accordingly.

2. **TTL fields passed as duration strings instead of integer seconds.** In both `vault_database_secret_backend_role` and the `postgresql` block of `vault_database_secret_backend_connection`, the post used duration strings like `"1h"`, `"24h"`, `"30m"`, and `"5m"`. The provider schema defines `default_ttl`, `max_ttl`, and `max_connection_lifetime` as `schema.TypeInt` (seconds), and these string values would not coerce. Fixed by converting to integer seconds: `"1h"` → `3600`, `"24h"` → `86400`, `"30m"` → `1800`, `"5m"` → `300`. This was applied in all four locations (PostgreSQL connection's `max_connection_lifetime`, PostgreSQL `app_readonly` role, PostgreSQL `migrations` role, and MySQL `mysql_app` role).

## Review Notes

- The `postgresql` block connection URL format `postgresql://{{username}}:{{password}}@host:port/db?sslmode=require` is correct per the database-plugin template syntax.
- The `mysql_aurora` block is valid and exists in the provider (engine `mysql_aurora`, plugin `mysql-aurora-database-plugin`). The connection URL format `{{username}}:{{password}}@tcp(host:port)/` is the correct DSN form for the MySQL Go driver that the plugin uses.
- PostgreSQL role `creation_statements` correctly use `CREATE ROLE ... WITH LOGIN PASSWORD '...' VALID UNTIL '{{expiration}}'`, which is the documented Vault template. The additional per-object grants are valid SQL.
- The conclusion's claim that "the `vault_admin` account ... only needs CREATE USER and GRANT permissions" is an oversimplification; for PostgreSQL the root user typically needs `CREATEROLE` plus sufficient privileges on the target objects to grant them. Not corrected as this is advisory guidance rather than a concrete technical error in code.
- The `lifecycle { ignore_changes = [] }` block in `aws_ssm_parameter.db_url` is a no-op (empty list ignores nothing); it reads more as a comment placeholder. Left as-is since it is not incorrect, just redundant.
- Version caveat: all fixes were validated against the current `main` branch of hashicorp/terraform-provider-vault. Older provider versions behave identically for these TTL fields (TypeInt has been stable), and `vault_database_secret_backend_creds` has never been registered.
