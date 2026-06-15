# Validation Summary: How to Design Multi-Tenant Schemas in PostgreSQL

## Status
validated

## Post Type
Technical guide/tutorial

## Technologies Covered
- PostgreSQL schemas, databases, Row Level Security, constraints, indexes, roles, grants, `search_path`, `pg_dump`/`pg_restore`, `createdb`, and `psql`
- PL/pgSQL dynamic SQL with `format()`
- Python database access with psycopg2
- Multi-tenant SaaS database architecture

## Sources Consulted
- PostgreSQL Row Security Policies: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- PostgreSQL CREATE POLICY: https://www.postgresql.org/docs/current/sql-createpolicy.html
- PostgreSQL SET command and `search_path`: https://www.postgresql.org/docs/current/sql-set.html
- PostgreSQL Schemas and `search_path`: https://www.postgresql.org/docs/current/ddl-schemas.html
- PostgreSQL Constraints and foreign keys: https://www.postgresql.org/docs/current/ddl-constraints.html
- PostgreSQL GRANT and sequence privileges: https://www.postgresql.org/docs/current/sql-grant.html
- PostgreSQL `current_setting` and `set_config`: https://www.postgresql.org/docs/current/functions-admin.html
- PostgreSQL pg_dump/pg_restore logical backup behavior: https://www.postgresql.org/docs/current/app-pgdump.html and https://www.postgresql.org/docs/current/app-pgrestore.html
- PostgreSQL createdb utility: https://www.postgresql.org/docs/current/app-createdb.html
- PostgreSQL psql utility: https://www.postgresql.org/docs/current/app-psql.html
- psycopg2 SQL string composition: https://www.psycopg.org/docs/sql.html

## Issues Found
- The shared-tables SQL tried to enable Row Level Security before creating the `users` and `orders` tables. Moved the `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` statements after table creation.
- The `orders.user_id REFERENCES users(id)` relationship allowed an order row to carry one tenant's `tenant_id` while referencing a user from another tenant. Added a composite unique constraint on `users(tenant_id, id)` and a composite foreign key from `orders(tenant_id, user_id)` to enforce tenant-consistent references.
- The RLS role grants did not include sequence privileges, so inserts into tables using `SERIAL` IDs could fail for `app_user`. Added `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user`.
- The Python tenant context example used a parameterized `SET` statement. Replaced it with `set_config('app.current_tenant', %s, false)`, which is the appropriate PostgreSQL function form for setting a custom GUC from a bound value.
- The schema-routing Python examples interpolated schema names through unsafe or invalid SQL construction. Updated them to use `psycopg2.sql.Identifier`, matching psycopg2's documented approach for SQL identifiers.
- The post overstated separate-schema backup/restore granularity as a generic backup property. Clarified that individual tenant schema dump/restore requires logical backups and updated the decision matrix accordingly.
- The post description listed only shared tables and separate schemas even though the article covers separate databases too. Updated the description.
- The shared-table pros claimed there is no schema migration complexity. Changed this to no per-tenant schema migration complexity.

## Review Notes
The architecture guidance is broadly accurate, but the tenant-count ranges in the decision matrix are rules of thumb rather than PostgreSQL limits. Local PostgreSQL client binaries were not installed in the review environment, so command syntax was checked against official PostgreSQL documentation instead of local `--help` output.
