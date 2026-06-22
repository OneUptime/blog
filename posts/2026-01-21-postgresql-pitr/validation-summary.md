# Validation Summary: How to Restore PostgreSQL to a Point in Time

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL point-in-time recovery
- PostgreSQL WAL archiving and recovery targets
- pg_basebackup
- pgBackRest
- Barman
- Linux systemd and shell commands
- AWS CLI S3 restore examples

## Sources Consulted
- PostgreSQL documentation: Continuous Archiving and Point-in-Time Recovery (PITR): https://www.postgresql.org/docs/current/continuous-archiving.html
- PostgreSQL documentation: Write Ahead Log / archive recovery and recovery target settings: https://www.postgresql.org/docs/current/runtime-config-wal.html
- PostgreSQL documentation: pg_basebackup: https://www.postgresql.org/docs/current/app-pgbasebackup.html
- PostgreSQL documentation: System Administration Functions, including pg_walfile_name and recovery functions: https://www.postgresql.org/docs/current/functions-admin.html
- pgBackRest Command Reference: https://pgbackrest.org/command.html
- Barman Recovery documentation: https://docs.pgbarman.org/release/3.18.0/user_guide/recovery.html
- Barman Commands Reference for list-backups: https://docs.pgbarman.org/release/3.12.1/user_guide/commands.html

## Issues Found
- Corrected the Barman backup-listing command from `barman list-backup` to the current documented `barman list-backups`.
- Clarified WAL segment naming. WAL files are not simply `TIMELINE + LSN`; PostgreSQL WAL segment names include the timeline ID and WAL position, and `pg_walfile_name(lsn)` should be used for exact LSN mapping.
- Fixed the description of `recovery_target = 'immediate'`. It recovers only until the database reaches consistency, not to the end of available WAL. Added the correct note that leaving recovery target settings unset recovers through available WAL.
- Corrected the `pg_wal_replay_resume()` comment for paused recovery so it reflects finishing recovery at the target.
- Removed the misleading `SELECT xmin, xmax, * FROM pg_class` example for finding recovery XIDs. `xmin` and `xmax` are tuple metadata and are not a reliable commit timeline.
- Updated the LSN description from `segment/offset` to a hexadecimal WAL location.
- Updated the Barman PITR example from `barman recover` to the current documented `barman restore`.
- Added ownership correction after copying a base backup to a separate server, and made `recovery.signal` creation run as the `postgres` user.
- Fixed the PITR test script so tar-format `pg_basebackup` output is written to a separate backup directory before extraction, shell paths are quoted, unnecessary variables are removed, and the recovery target is generated after the base backup with WAL activity forced after the target.

## Review Notes
The guide assumes PostgreSQL 16 Debian/Ubuntu-style paths and service names. Those paths are distribution-specific, but the PostgreSQL recovery concepts and settings are current for PostgreSQL 12 and later.
