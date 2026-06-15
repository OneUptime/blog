# Validation Summary: How to Fix 'could not extend file' Errors in PostgreSQL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- PostgreSQL
- SQL
- PostgreSQL WAL and replication slots
- PostgreSQL tablespaces
- Linux filesystem and disk usage tools
- XFS and ext4 filesystems

## Sources Consulted
- PostgreSQL documentation: Database File Layout, https://www.postgresql.org/docs/current/storage-file-layout.html
- PostgreSQL documentation: WAL Configuration, https://www.postgresql.org/docs/current/wal-configuration.html
- PostgreSQL documentation: Write Ahead Log settings, https://www.postgresql.org/docs/current/runtime-config-wal.html
- PostgreSQL documentation: System Administration Functions, https://www.postgresql.org/docs/current/functions-admin.html
- PostgreSQL documentation: CREATE TABLESPACE, https://www.postgresql.org/docs/current/sql-createtablespace.html
- PostgreSQL documentation: Tablespaces, https://www.postgresql.org/docs/current/manage-ag-tablespaces.html
- PostgreSQL documentation: VACUUM, https://www.postgresql.org/docs/current/sql-vacuum.html
- PostgreSQL documentation: Table Partitioning, https://www.postgresql.org/docs/current/ddl-partitioning.html
- PostgreSQL documentation: Vacuuming configuration, https://www.postgresql.org/docs/current/runtime-config-vacuum.html
- GNU coreutils local help for `df`, `du`, and `ls`
- GNU findutils local help for `find`
- APT local help for `apt-get clean`
- util-linux local help for `mount` and `findmnt`
- Linux xfs(5) manual page, https://man7.org/linux/man-pages/man5/xfs.5.html

## Issues Found
- The `disk_usage_monitor` view selected `datname` through `pg_database_size(datname)` without a `FROM pg_database` clause. Added `FROM pg_database` so the view is valid SQL.
- The SQL alert query attempted to cast the `data_directory` setting to `bigint`, but `data_directory` is a filesystem path, not a size. Replaced it with a configurable `data_volume_bytes` threshold and compared total database size against that value.
- The emergency recovery section recommended deleting `pg_wal/archive_status/*.done` as "archived WAL files." Those files are archive status markers, not the archived WAL segments themselves, and deleting files under `pg_wal` is unsafe advice. Replaced the command with guidance to clean only an external WAL archive location when backups/PITR requirements allow it, and added a warning not to manually delete from `pg_wal` or `pg_wal/archive_status`.
- The post implied `VACUUM FULL` can be used as immediate cleanup even when space is exhausted. PostgreSQL documents that `VACUUM FULL` rewrites the table and needs extra disk space. Updated comments to say it should be run after enough working space exists, and clarified that plain `VACUUM` usually makes space reusable inside the table rather than returning it to the OS.
- The filesystem recommendations listed `nobarrier` for XFS. Current XFS documentation lists `barrier/nobarrier` as removed mount options on modern Linux kernels. Replaced the recommendation with a note not to set `barrier/nobarrier`.

## Review Notes
The remaining examples are illustrative and assume Debian/Ubuntu-style PostgreSQL paths such as `/var/lib/postgresql/14/main`. Managed PostgreSQL services and RPM-based distributions use different paths and may restrict superuser-only functions such as `pg_ls_waldir()`.
