# Validation Summary: Set Up Automated Database Backups for PostgreSQL on Kubernetes Using WAL-G

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- PostgreSQL 16
- Kubernetes StatefulSet, Secret, ConfigMap, CronJob, Job, and PersistentVolumeClaim resources
- WAL-G for PostgreSQL backup, WAL archiving, restore, retention, and encryption
- Amazon S3-compatible object storage
- Bash shell scripts

## Sources Consulted
- WAL-G official documentation: https://wal-g.readthedocs.io/PostgreSQL/
- WAL-G official GitHub README and command reference: https://github.com/wal-g/wal-g
- PostgreSQL 16 continuous archiving and PITR documentation: https://www.postgresql.org/docs/16/continuous-archiving.html
- PostgreSQL 16 recovery configuration compatibility note: https://www.postgresql.org/docs/16/recovery-config.html
- PostgreSQL 16 WAL and archive recovery settings: https://www.postgresql.org/docs/16/runtime-config-wal.html
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes CronJob API documentation: https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/
- PostgreSQL Docker Official Image documentation: https://hub.docker.com/_/postgres

## Issues Found
- The original snippets used `wal-g/wal-g:latest`, but that Docker Hub image does not exist, and the official WAL-G documentation points users to release binaries/builds rather than an official runtime image. Replaced it with a clearly named custom image placeholder, `your-registry/postgres-16-walg:latest`, and noted that it must include WAL-G.
- The original PostgreSQL container used `postgres:16-alpine`, but `archive_command` runs inside the PostgreSQL server container, so that container must include the `wal-g` binary. Updated the PostgreSQL container image to the custom WAL-G-enabled PostgreSQL image.
- The original examples used `envdir`, but neither the PostgreSQL image nor WAL-G itself provides that command by default. Reworked the Kubernetes specs to inject the Secret with `envFrom` and changed WAL-G commands to read environment variables directly.
- The original ConfigMap included `recovery.conf`, which PostgreSQL 12 and later removed; PostgreSQL 16 will not use that file and will not start if it exists in the data directory. Removed the obsolete `recovery.conf` snippet and kept PITR configuration in `postgresql.auto.conf` with `recovery.signal`.
- The original backup and restore paths mixed `/var/lib/postgresql/data` with `PGDATA=/var/lib/postgresql/data/pgdata`. Updated `PGDATA`, backup checks, `backup-push`, `backup-fetch`, and PITR cleanup to consistently use `$PGDATA`.
- The original backup CronJob used `wal-g backup-push /var/lib/postgresql/data`, which conflicts with WAL-G's documented requirement that the data directory argument match `PGDATA` when set. Changed it to `wal-g backup-push "$PGDATA" --verify`.
- The original verification example used `wal-g backup-fetch ... --verify`, but WAL-G documents `--verify` for page checksum verification during `backup-push`, not `backup-fetch`. Replaced it with a restore-fetch smoke test.
- The original retention commands used `wal-g delete --confirm retain 7` while delta backups were enabled, which can fail when the retained backup is a delta. Changed cleanup to `wal-g delete retain FULL 7 --confirm` where the intent is to keep full backup chains.
- The original `delete before "2026-01-01T00:00:00Z"` example was invalid for WAL-G, because `delete before` expects a backup name. Replaced it with the documented `retain ... --after` time-window form.
- The original monitoring script piped a timestamp into `date -d -`, which treats `-` as the date string instead of reading stdin. Split timestamp extraction and date conversion into separate commands.
- The original monitoring script searched `wal-verify` output for the word `verified`, but WAL-G reports integrity status values such as `OK`, `WARNING`, and `FAILURE`. Updated it to use `wal-g wal-verify integrity --json` and check `.integrity.status`.
- The PITR restore job originally removed only non-hidden files under `pgdata`, which could leave stale dotfiles behind. Changed it to remove and recreate `$PGDATA` before fetching the backup.
- The PITR restore and init restore flows did not reset ownership after `backup-fetch`. Added `chown -R postgres:postgres "$PGDATA"` after restore.

## Review Notes
The article is technically valid after correction, but it still assumes the reader has built and published a custom PostgreSQL 16 image containing `wal-g` and, for monitoring, `jq`. A future improvement would be to add a short Dockerfile for that image or use a maintained PostgreSQL operator with WAL-G support, but that would be a scope expansion beyond this validation pass.
