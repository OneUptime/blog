# Validation Summary: How to Back Up and Restore Drone's Database Without Breaking Repository and Build Metadata

## Status
validated

## Post Type
Technical operations guide

## Technologies Covered
- Drone CI
- SQLite
- PostgreSQL
- S3-compatible object storage
- CI runners and webhooks

## Sources Consulted
- [Drone database documentation](https://docs.drone.io/server/storage/database/)
- [Drone database encryption documentation](https://docs.drone.io/server/storage/encryption/)
- [Drone blob storage documentation](https://docs.drone.io/server/storage/blob/)
- [SQLite Online Backup API](https://www.sqlite.org/backup.html)
- [SQLite command-line shell documentation](https://sqlite.org/cli.html)
- [PostgreSQL `pg_dump` documentation](https://www.postgresql.org/docs/current/app-pgdump.html)
- [PostgreSQL `pg_restore` documentation](https://www.postgresql.org/docs/current/app-pgrestore.html)

## Issues Found
No technical issues found.

## Review Notes
The post correctly distinguishes a database backup from external S3-compatible blob storage and cluster-wide PostgreSQL objects. The SQLite `.backup` command is appropriate for a consistent live snapshot, and the source-file existence check avoids SQLite silently creating an empty database at a mistyped path. The PostgreSQL custom archive, archive listing, and `--exit-on-error` restore guidance are valid. Operators should continue to apply PostgreSQL's version-compatibility rules when selecting `pg_dump`: it can generally dump older servers, but it cannot dump a server newer than its own major version.
