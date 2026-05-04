# Validation Summary: How to Configure Postgresql Provider with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- PostgreSQL
- PostgreSQL Terraform/OpenTofu Provider (`cyrilgdn/postgresql`)
- HCL (HashiCorp Configuration Language)

## Sources Consulted
- [PostgreSQL Provider - cyrilgdn - Terraform Registry](https://registry.terraform.io/providers/cyrilgdn/postgresql/latest/docs)
- [postgresql_database | Resources | cyrilgdn/postgresql](https://registry.terraform.io/providers/cyrilgdn/postgresql/latest/docs/resources/postgresql_database)
- [postgresql_role | Resources | cyrilgdn/postgresql](https://registry.terraform.io/providers/cyrilgdn/postgresql/latest/docs/resources/postgresql_role)
- [GitHub - cyrilgdn/terraform-provider-postgresql](https://github.com/cyrilgdn/terraform-provider-postgresql)
- [PostgreSQL libpq environment variables](https://www.postgresql.org/docs/current/libpq-envars.html)
- [OpenTofu documentation](https://opentofu.org/docs/)

## Issues Found
The post's title and introduction claim to cover the PostgreSQL provider for OpenTofu, but the original body used generic placeholder content (`provider_name`, `provider-namespace/provider-name`, `PROVIDER_API_KEY`, `PROVIDER_API_SECRET`, `provider_example_resource`) that did not configure the PostgreSQL provider at all. The provider source, environment variables, provider block, and example resource were all wrong for PostgreSQL. I made the following targeted fixes:

- **Provider Installation block:** Replaced the placeholder `provider_name` / `provider-namespace/provider-name` with the actual community PostgreSQL provider declaration: `postgresql = { source = "cyrilgdn/postgresql", version = "~> 1.22" }`. `cyrilgdn/postgresql` is the de-facto community provider for managing PostgreSQL objects (roles, databases, schemas, grants) and is published on both the Terraform and OpenTofu registries. Version `~> 1.22` matches the current 1.x major release line.
- **Authentication section:** PostgreSQL doesn't authenticate via API keys — it uses host/port/database/username/password (with optional SSL mode). I replaced `PROVIDER_API_KEY` / `PROVIDER_API_SECRET` with the standard libpq-style environment variables (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGSSLMODE`) which the provider's `host`, `port`, `username`, `password`, `database`, and `sslmode` arguments fall back to per the official provider docs. The provider block is now `provider "postgresql"`.
- **Example Resource section:** Replaced the fictional `provider_example_resource` with two real PostgreSQL provider resources: `postgresql_role` (creating a login role with a password) and `postgresql_database` (creating a database owned by that role, with documented `encoding`, `lc_collate`, `lc_ctype`, `connection_limit`, and `allow_connections` arguments). These match the official `cyrilgdn/postgresql` resource schemas. PostgreSQL objects don't carry arbitrary `tags` like cloud APIs do, so the placeholder `tags = { ... }` map was removed.
- **Variables section:** Added `app_role_password` (`sensitive = true`) since the new example takes a role password as input.
- **Outputs section:** Updated the output to reference the new `postgresql_database.app.name` and `postgresql_role.app.name` attributes instead of the fictional resource ID.

## Review Notes
- The community PostgreSQL provider is published as `cyrilgdn/postgresql`. There is no first-party HashiCorp PostgreSQL provider, so this is the correct one to recommend.
- The provider connects from the OpenTofu/Terraform host to the PostgreSQL server, so the host running `tofu apply` needs network reachability and credentials with sufficient privileges (typically `CREATE ROLE` / `CREATE DATABASE`, often via a superuser or a role granted those attributes).
- Storing role passwords in plain Terraform variables is convenient for tutorials but should be sourced from a secrets manager (Vault, AWS Secrets Manager, etc.) in production. The `sensitive = true` flag on `app_role_password` keeps it out of plan/apply output, but it can still appear in state — consider using ephemeral resources (OpenTofu 1.11+) or write-only attributes for sensitive inputs.
- `sslmode = "require"` (or stricter, `"verify-full"`) is recommended for any non-local PostgreSQL connection. The example sets it via `PGSSLMODE`.
- The `required_version = ">= 1.6.0"` constraint is appropriate for OpenTofu (1.6.0 was OpenTofu's first GA release in January 2024).
- Best Practices section was left unchanged — its guidance (env vars/secrets manager for credentials, pinning versions, committing the lock file, per-environment provider configurations) is accurate for OpenTofu and the PostgreSQL provider.
