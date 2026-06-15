# Validation Summary: How to Fix 'cannot open tablespace' Errors in PostgreSQL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- PostgreSQL tablespaces
- PostgreSQL system catalogs and SQL commands
- Linux file systems, mounts, permissions, and symbolic links
- SELinux file contexts
- Disk health and file system checks

## Sources Consulted
- PostgreSQL 18 documentation: Tablespaces - https://www.postgresql.org/docs/current/manage-ag-tablespaces.html
- PostgreSQL 18 documentation: CREATE TABLESPACE - https://www.postgresql.org/docs/current/sql-createtablespace.html
- PostgreSQL 18 documentation: ALTER TABLE - https://www.postgresql.org/docs/current/sql-altertable.html
- PostgreSQL 18 documentation: ALTER INDEX - https://www.postgresql.org/docs/current/sql-alterindex.html
- PostgreSQL 18 documentation: ALTER DATABASE - https://www.postgresql.org/docs/current/sql-alterdatabase.html
- PostgreSQL 18 documentation: DROP TABLESPACE - https://www.postgresql.org/docs/current/sql-droptablespace.html
- PostgreSQL 18 documentation: Database File Layout - https://www.postgresql.org/docs/current/storage-file-layout.html
- PostgreSQL 18 documentation: SQL Dump - https://www.postgresql.org/docs/current/backup-dump.html
- PostgreSQL 18 documentation: pg_dump - https://www.postgresql.org/docs/current/app-pgdump.html
- PostgreSQL 18 documentation: Continuous Archiving and Point-in-Time Recovery - https://www.postgresql.org/docs/current/continuous-archiving.html
- PostgreSQL 18 documentation: pg_tablespace catalog - https://www.postgresql.org/docs/current/catalog-pg-tablespace.html

## Issues Found
- The missing tablespace directory section implied that recreating an empty directory could fix a deleted tablespace. Updated it to distinguish recreating a missing mount point from restoring lost PostgreSQL data from backup.
- The broken symbolic link fix modified `pg_tblspc` while PostgreSQL could still be running. Updated the snippet to stop PostgreSQL before changing the symlink and start it afterward.
- Queries that identified objects in a tablespace only checked `pg_class.reltablespace` directly. Updated them to account for `reltablespace = 0`, which means the relation uses the current database's default tablespace.
- The bulk object move example used a custom PL/pgSQL loop over ordinary tables only. Replaced it with PostgreSQL's documented `ALTER TABLE ALL IN TABLESPACE ... SET TABLESPACE ...` and `ALTER INDEX ALL IN TABLESPACE ... SET TABLESPACE ...` forms.
- The `ALTER DATABASE ... SET TABLESPACE` explanation understated the operation. Updated the comments to clarify that it moves objects in the database's old default tablespace, cannot run inside a transaction block, requires no active connections, and requires the new tablespace to be empty for that database.
- The tablespace usage query treated `reltablespace = 0` as `pg_default`, which is not always correct when a database has a different default tablespace. Updated it to use the current database's `dattablespace`.
- The monitoring view marked zero-byte tablespaces as `EMPTY or ERROR`, but an empty tablespace is valid and `pg_tablespace_size()` would raise an error for inaccessible storage rather than return an error status. Updated the status labels to avoid that false implication.
- The backup best practice said `pg_dump` includes tablespace info without noting that tablespace definitions are cluster-wide. Updated it to clarify that `pg_dump` preserves object tablespace selections and `pg_dumpall` is needed for cluster-wide tablespace definitions.
- The conclusion repeated the misleading directory recreation guidance. Updated it to say missing mount points can be recreated, but missing data must be restored.

## Review Notes
Commands such as `smartctl`, `fsck`, `mount`, `df`, `restorecon`, and `semanage` are environment-dependent and may require package installation or distribution-specific service names. The PostgreSQL-specific SQL and tablespace behavior were validated against current official PostgreSQL documentation.
