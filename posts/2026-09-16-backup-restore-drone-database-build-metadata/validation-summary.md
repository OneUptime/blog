# Validation Summary: Back Up and Restore Drone's Database While Preserving Repository and Build Data

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
- Added `set -eu` to both backup shell snippets so a failed backup stops execution before archive validation. Without fail-fast behavior, a failed SQLite `.backup` could be followed by a successful integrity check of a stale backup, leaving the snippet with exit status zero. Clarified that backup command success must be checked before the output is trusted.

## Review Notes
The post correctly distinguishes a database backup from external S3-compatible blob storage and cluster-wide PostgreSQL objects. The SQLite `.backup` command is appropriate for a consistent live snapshot, and the source-file existence check avoids SQLite silently creating an empty database at a mistyped path. The PostgreSQL custom archive, archive listing, and `--exit-on-error` restore guidance are valid. Operators should continue to apply PostgreSQL's version-compatibility rules when selecting `pg_dump`: it can generally dump older servers, but it cannot dump a server newer than its own major version.

A local SQLite reproduction used a corrupt source and an existing valid backup. The original snippet printed a backup error followed by `ok` and exited zero; fail-fast behavior stopped it at the backup error. No live Drone database was accessed.
