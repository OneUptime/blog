# Validation Summary: How to Configure the PostgreSQL Backend in OpenTofu - Opentofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (`tofu` CLI)
- Terraform `pg` backend block
- PostgreSQL (server, advisory locks, schemas)
- libpq environment variables (`PGUSER`, `PGPASSWORD`, `PGHOST`, `PGPORT`, `PGDATABASE`)
- Amazon RDS / Aurora PostgreSQL
- `pg_dump` / `psql`

## Sources Consulted
- OpenTofu PostgreSQL backend docs: https://opentofu.org/docs/language/settings/backends/pg/
- PostgreSQL libpq environment variable reference (PGUSER, PGPASSWORD, PGHOST, PGPORT, PGDATABASE)
- PostgreSQL advisory lock documentation

## Issues Found
1. **Database Schema section was incorrect.** The post claimed OpenTofu creates a table named `terraform_state` with columns `id BIGSERIAL`, `name TEXT`, `state BYTEA`, and `lock TEXT`. The actual schema documented by OpenTofu is a table named `states` (default), placed in the `terraform_remote_state` schema (default), with three columns: a serial integer `id` (used as the key for advisory locks), `name` text (workspace name with unique index), and `data` text (the state contents). There is no `lock` column — locking is implemented via PostgreSQL advisory locks keyed on the row's `id`. Updated the SQL block and added a note explaining the locking mechanism.
2. **Setting Up the Database section had a misleading GRANT.** The post granted `ALL ON SCHEMA public` with a comment saying "OpenTofu creates its own tables". OpenTofu does not store its tables in `public` by default; it creates and uses its own schema (default `terraform_remote_state`). Replaced with `GRANT CREATE ON DATABASE terraform_state TO tofu_user;` so the user can actually create the schema, and updated the comment to reflect the real default schema name.
3. **Backup and Recovery `pg_dump` command targeted the wrong schema and table.** The original command used `--schema=public --table=terraform_state`, both of which are incorrect for a default install. Updated to `--schema=terraform_remote_state --table='terraform_remote_state.states'` to match the real defaults.

## Review Notes
- The other configuration snippets (`backend "pg"`, `conn_str`, `schema_name`, `?sslmode=require` in the connection string, libpq env vars, `tofu workspace` commands, RDS connection example) match the official documentation and work as written.
- The post does not mention several useful options the `pg` backend supports — `table_name`, `index_name`, `skip_schema_creation`, `skip_table_creation`, and `skip_index_creation` — but their omission is not a technical error, just a scope choice.
- Workspaces are correctly described as separate rows in the same table keyed by `name` (with `default` as the implicit workspace).
