# Validation Summary: How to Check if Table Exists in a Schema in PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- SQL
- PL/pgSQL
- PostgreSQL system catalogs
- SQL information schema

## Sources Consulted
- PostgreSQL 18 Documentation: Information Schema `tables` - https://www.postgresql.org/docs/current/infoschema-tables.html
- PostgreSQL 18 Documentation: Information Schema `views` - https://www.postgresql.org/docs/current/infoschema-views.html
- PostgreSQL 18 Documentation: `pg_class` catalog - https://www.postgresql.org/docs/current/catalog-pg-class.html
- PostgreSQL 18 Documentation: `pg_tables` view - https://www.postgresql.org/docs/current/view-pg-tables.html
- PostgreSQL 18 Documentation: `pg_matviews` view - https://www.postgresql.org/docs/current/view-pg-matviews.html
- PostgreSQL 18 Documentation: System information functions including `to_regclass()` and `pg_my_temp_schema()` - https://www.postgresql.org/docs/current/functions-info.html
- PostgreSQL 18 Documentation: `CREATE TABLE` - https://www.postgresql.org/docs/current/sql-createtable.html
- PostgreSQL 18 Documentation: `DROP TABLE` - https://www.postgresql.org/docs/current/sql-droptable.html
- PostgreSQL 18 Documentation: `pg_inherits` catalog - https://www.postgresql.org/docs/current/catalog-pg-inherits.html

## Issues Found
- Removed the unsupported claim that `pg_tables` is "slightly faster than information_schema." The official documentation describes `pg_tables` as a PostgreSQL system view for table metadata but does not guarantee a performance advantage over information schema views.
- Reworded the direct `pg_class` example from "Fastest method" / "maximum performance" to "Direct catalog method" / "low-level catalog access." PostgreSQL documents the catalog fields, but performance depends on workload, version, permissions, and planning.
- Added the current `pg_class.relkind` value `'I'` for partitioned indexes, which is listed in the PostgreSQL system catalog documentation.
- Corrected the temporary table catalog query to use `pg_my_temp_schema()` instead of matching namespace names with `LIKE 'pg_temp%'`. The original query could match temporary schemas belonging to other sessions; `pg_my_temp_schema()` checks the current session's temporary schema.
- Schema-qualified the partition listing query by joining `pg_namespace` and filtering `n.nspname = 'public'`. The original query filtered only by parent relation name and could return partitions for an `events` table in another schema.

## Review Notes
The examples are PostgreSQL-specific except for the information schema examples. `information_schema.tables` and `information_schema.views` only show objects the current user can access, so existence checks through those views can be affected by privileges.
