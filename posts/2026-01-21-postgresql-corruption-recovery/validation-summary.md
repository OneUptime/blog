# Validation Summary: How to Recover from PostgreSQL Corruption

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL
- PostgreSQL data checksums
- PostgreSQL amcheck extension
- PostgreSQL backup and restore tools
- pgBackRest
- PostgreSQL WAL recovery tools

## Sources Consulted
- PostgreSQL pg_checksums documentation: https://www.postgresql.org/docs/current/app-pgchecksums.html
- PostgreSQL data checksums documentation: https://www.postgresql.org/docs/current/checksums.html
- PostgreSQL amcheck documentation: https://www.postgresql.org/docs/current/amcheck.html
- PostgreSQL REINDEX documentation: https://www.postgresql.org/docs/current/sql-reindex.html
- PostgreSQL pg_resetwal documentation: https://www.postgresql.org/docs/current/app-pgresetwal.html
- PostgreSQL backup and restore documentation: https://www.postgresql.org/docs/current/backup.html
- PostgreSQL pg_restore documentation: https://www.postgresql.org/docs/current/app-pgrestore.html
- PostgreSQL createdb documentation: https://www.postgresql.org/docs/current/app-createdb.html
- PostgreSQL COPY documentation: https://www.postgresql.org/docs/current/sql-copy.html
- pgBackRest command documentation: https://pgbackrest.org/command.html

## Issues Found
- The checksum verification example called `pg_checksums --check` without stopping PostgreSQL. PostgreSQL requires `pg_checksums` to run only against a cleanly shut down cluster. Added `systemctl stop postgresql` and `systemctl start postgresql` around the check.
- The amcheck parent verification example used `bt_index_check('idx_users_email', true)`, but parent/child relationship verification is performed by `bt_index_parent_check`. Updated the example to use `bt_index_parent_check('idx_users_email', true)`.
- The "Check all indexes" query passed every index to `bt_index_check`, including unsupported or invalid indexes. Updated it to check only valid, ready, non-temporary B-tree indexes.
- The logical `pg_restore` example stopped PostgreSQL before running `pg_restore`, but `pg_restore -d` connects to a running server. Updated the example to restore a logical backup while PostgreSQL is running and kept the stopped-server flow only for PITR with pgBackRest.
- The `pg_resetwal` last-resort example omitted `-f`, which PostgreSQL may require for unclean shutdown or corrupted control-file states. Added `-f` to match the documented forced recovery case.
- The existing-cluster checksum enablement example omitted the required offline state. Added stop/start commands around `pg_checksums --enable`.
- The scheduled checksum verification example would try to run `pg_checksums` against a potentially running cluster. Updated it to show an offline maintenance-window command.

## Review Notes
The single-table recovery `COPY` example is syntactically valid, but server-side `COPY` reads and writes files from the PostgreSQL server's filesystem and requires suitable privileges. In many operational environments, psql `\copy` is easier because it uses the client filesystem and does not require server file access privileges.
