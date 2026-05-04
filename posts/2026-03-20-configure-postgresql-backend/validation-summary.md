# Validation Summary: How to Configure the PostgreSQL Backend in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (pg backend)
- Terraform (configuration block syntax)
- PostgreSQL
- AWS RDS for PostgreSQL
- HCL (HashiCorp Configuration Language)

## Sources Consulted
- OpenTofu official documentation: https://opentofu.org/docs/language/settings/backends/pg/
- PostgreSQL connection URI documentation (libpq parameters: sslmode, connect_timeout, application_name)
- AWS RDS aws_db_instance Terraform resource reference

## Issues Found

1. **Wrong PostgreSQL version requirement.** The post claimed PostgreSQL 9.5+. The official OpenTofu pg backend documentation requires PostgreSQL 10 or newer. Updated the prerequisites accordingly.

2. **Wrong configuration parameter name (`schema_prefix` → `schema_name`).** The post repeatedly used `schema_prefix`, which is not a valid pg backend parameter. The correct parameter is `schema_name`. Replaced all occurrences (in the Step 2 block, the env-var section, and the Schema-Based Isolation section).

3. **Misleading description of `schema_name` semantics.** The post described `schema_prefix` as a string prefix that produces tables like `networking_states` and `compute_states`. In reality `schema_name` names a PostgreSQL schema (namespace); the table inside is always called `states` by default (configurable via `table_name`). Reworded the Schema-Based Isolation explanation and the workspace section to reflect this.

4. **Incorrect Database Schema SQL example.** The original example showed `id TEXT PRIMARY KEY`, `state BYTEA`, and `lock_info TEXT`. The actual schema OpenTofu creates is: `id` as `SERIAL PRIMARY KEY`, `name TEXT` (with a unique index), and `data TEXT`. There is no `lock_info` column — locks are PostgreSQL advisory locks keyed on the row `id`. Rewrote the CREATE TABLE example to match the real schema, qualified the table with the schema name, and added a clarifying sentence about advisory locks.

5. **Monitoring queries referenced a non-existent table and column.** Queries selected from `opentofu_states` (no such table) using `state` and `lock_info` columns (neither exists). Rewrote the queries to use the schema-qualified `terraform_remote_state.states` table and the correct `data` column, and replaced the `lock_info` query with a `pg_locks` query for advisory locks.

## Review Notes
- The example AWS RDS resource hardcodes `engine_version = "15.3"`. PostgreSQL 15.3 was a real RDS minor version but is now superseded by later 15.x patch releases; readers should pin to the latest patched 15.x available in their region.
- The `GRANT ALL PRIVILEGES ON DATABASE` plus `GRANT ALL ON SCHEMA public` pattern works on PostgreSQL ≤ 14 out of the box. On PostgreSQL 15+, the `public` schema no longer grants `CREATE` to everyone by default, so the explicit `GRANT ALL ON SCHEMA public TO opentofu_user` shown in Step 1 is in fact necessary on 15+ — the post happens to be correct here, but readers on older PostgreSQL should know this is otherwise a no-op.
- The connection string examples use the `postgresql://` URI scheme; OpenTofu also accepts the shorter `postgres://` alias (the official docs example uses `postgres://`). Both are valid.
- `PG_CONN_STR` is correct, and the backend additionally accepts the corresponding `PG_SCHEMA_NAME`, `PG_TABLE_NAME`, etc. environment variables — not mentioned but not required to mention.
