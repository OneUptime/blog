# Validation Summary: How to Use pgBackRest for PostgreSQL Backups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- pgBackRest
- WAL archiving
- Point-in-time recovery
- S3, Google Cloud Storage, and Azure Blob Storage repositories
- systemd timers and cron
- Prometheus/node_exporter style monitoring

## Sources Consulted
- pgBackRest Configuration Reference: https://pgbackrest.org/configuration.html
- pgBackRest Command Reference: https://pgbackrest.org/command.html
- pgBackRest User Guide: https://pgbackrest.org/user-guide.html
- PostgreSQL APT Repository documentation: https://wiki.postgresql.org/wiki/Apt
- PostgreSQL Write Ahead Log documentation: https://www.postgresql.org/docs/current/runtime-config-wal.html
- PostgreSQL Continuous Archiving and PITR documentation: https://www.postgresql.org/docs/current/continuous-archiving.html

## Issues Found
- The prerequisite listed PostgreSQL 10+, which is outdated for a current guide because PostgreSQL 10 is no longer supported. Updated it to require a supported PostgreSQL release.
- The Ubuntu/Debian installation snippet used the deprecated `apt-key add` workflow. Replaced it with the current PGDG-supported `postgresql-common` repository setup script.
- The retention example described `repo1-retention-archive=7` as "7 days of WAL", but pgBackRest treats this as a number of backups worth of continuous WAL for the configured archive retention type. Updated the comments to describe full-backup-based WAL retention.
- The multiple repositories example used `repo-hardlink=y` and described it as backing up to both repositories. Hardlinking is a POSIX repository option, not a multi-repository backup selector. Updated it to `repo1-hardlink=y` and clarified that backups can target a specific repository with `--repo`.
- The restore cleanup command used a glob that would not remove hidden files in the PostgreSQL data directory. Replaced it with `find ... -mindepth 1 -delete`.
- The PITR and selective restore examples omitted the requirement to stop PostgreSQL and empty the data directory before restore. Added short prerequisite notes before those command blocks.
- The systemd timer commands omitted `systemctl daemon-reload` after creating unit files. Added the missing command.
- The monitoring script treated pgBackRest JSON `timestamp.stop` as a date string. It is an epoch timestamp, so the script now uses the value directly and handles missing backup data.
- The Prometheus example queried a non-existent `pgbackrest.backup` SQL table. Replaced it with a command that emits a metric from `pgbackrest info --output=json`.

## Review Notes
The remaining examples are broadly correct for current pgBackRest 2.x and PostgreSQL versions. The guide still uses placeholder cloud credentials and simple scheduling examples; production deployments should use secret management, explicit repository credential handling, and regular restore tests.
