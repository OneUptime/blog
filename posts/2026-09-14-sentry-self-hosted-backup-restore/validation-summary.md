# Validation Summary: How to Back Up and Restore Self-Hosted Sentry Across PostgreSQL, ClickHouse, and Object Storage

## Status
validated

## Post Type
Technical disaster-recovery guide

## Technologies Covered
- Self-hosted Sentry
- Docker and Docker Compose
- PostgreSQL
- ClickHouse
- Kafka and queues
- Amazon S3 and external object storage
- Shell commands and volume archives

## Sources Consulted
- [Sentry Self-Hosted Backup & Restore](https://develop.sentry.dev/self-hosted/backup/)
- [Sentry self-hosted `sentry-admin.sh`](https://github.com/getsentry/self-hosted/blob/master/sentry-admin.sh)
- [Docker volume backup and restore documentation](https://docs.docker.com/engine/storage/volumes/#back-up-restore-or-migrate-data-volumes)
- [Docker Compose `stop` reference](https://docs.docker.com/reference/cli/docker/compose/stop/)
- [Docker Compose `ps` reference](https://docs.docker.com/reference/cli/docker/compose/ps/)
- [PostgreSQL SQL dump documentation](https://www.postgresql.org/docs/current/backup-dump.html)
- [ClickHouse backup and restore documentation](https://clickhouse.com/docs/operations/backup)
- [Amazon S3 Versioning documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html)

## Issues Found
- The `sentry-admin.sh export` example used an arbitrary absolute path without explaining that the path is resolved inside the `web` container. The wrapper only maps the host directory selected by `SENTRY_DOCKER_IO_DIR` to `/sentry-admin`, so the example could write into the disposable container instead of the protected host directory. Changed the command to set `SENTRY_DOCKER_IO_DIR` and write to `/sentry-admin/export.json`, and documented the default host mapping.

## Review Notes
- The scoped `sentry-admin.sh` export is available in self-hosted Sentry 23.11.1 and later; operators on older releases must use the release-specific backup method documented by Sentry.
- Encrypted exports are tar archives rather than JSON files, so operators using encryption should choose an appropriate output filename and follow the installed version's CLI help.
- Full Docker-volume restore remains explicitly unsupported by Sentry and therefore requires version compatibility checks and rehearsed restores, as the post states.
