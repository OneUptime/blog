# Validation Summary: How to Back Up and Restore OneUptime Data

## Status
validated

## Post Type
Technical backup and disaster recovery guide.

## Technologies Covered
- OneUptime 12.0.33
- PostgreSQL, pg_dump, pg_restore, and libpq password files
- ClickHouse native backup and restore
- Redis and BullMQ
- Docker Compose, Kubernetes, Helm, CloudNativePG, and the Altinity ClickHouse operator
- Object storage, encryption secrets, and disaster recovery

## Sources Consulted
- [OneUptime 12.0.33 backup.sh](https://github.com/OneUptime/oneuptime/blob/12.0.33/backup.sh)
- [OneUptime 12.0.33 restore.sh](https://github.com/OneUptime/oneuptime/blob/12.0.33/restore.sh)
- [OneUptime database and backup options](https://github.com/OneUptime/oneuptime/blob/12.0.33/HelmChart/Public/oneuptime/docs/databases.md)
- [OneUptime Helm values](https://github.com/OneUptime/oneuptime/blob/12.0.33/HelmChart/Public/oneuptime/values.yaml)
- [OneUptime ClickHouse operations](https://github.com/OneUptime/oneuptime/blob/12.0.33/HelmChart/Docs/Clickhouse.md)
- [OneUptime Redis operations](https://github.com/OneUptime/oneuptime/blob/12.0.33/HelmChart/Docs/Redis.md)
- [OneUptime example environment configuration](https://github.com/OneUptime/oneuptime/blob/12.0.33/config.example.env)
- [OneUptime encryption implementation](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Server/Utils/Encryption.ts)
- [OneUptime Redis-backed BullMQ implementation](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Server/Infrastructure/Queue.ts)
- [PostgreSQL pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)
- [PostgreSQL pg_restore](https://www.postgresql.org/docs/current/app-pgrestore.html)
- [PostgreSQL password files](https://www.postgresql.org/docs/current/libpq-pgpass.html)
- [ClickHouse backup and restore overview](https://clickhouse.com/docs/concepts/features/backup-restore/overview)
- [ClickHouse backup and restore to disk](https://clickhouse.com/docs/concepts/features/backup-restore/local-disk)

## Issues Found
1. **Redis recovery could silently discard pending work.** The original recommendation to rebuild Redis empty treated it as disposable state. The pinned Queue implementation uses Redis-backed BullMQ queues, and Helm values identify telemetry, workflow, and other background processing. Clarified pending-job loss, queue draining, and the need to accept that loss or test Redis recovery and reconciliation. Added queued work to the consistency checkpoint.
2. **PostgreSQL recovery prerequisites were incomplete.** A single-database dump excludes global roles and tablespaces. Added preservation or recreation of these definitions and required their recreation before restoring the database so ownership and tablespace references can resolve.
3. **ClickHouse backup scope was insufficiently qualified for sharding.** The example omits ON CLUSTER and therefore does not automatically cover the whole cluster. Kept the valid SQL and added the requirement for a tested cluster-wide or per-shard procedure covering every shard.
4. **Initial deployment could start services before restoration.** The first restore step could start application processes and migrations against empty databases or temporary secrets. Clarified that application processes, workers, and migrations remain stopped until restoration completes, consistent with the later startup step.

## Review Notes
- Verified the pinned backup script uses custom-format pg_dump, day-of-month .backup filenames, git pull, and postgres:latest; the restore script uses --clean --if-exists. These are release-specific observations, not a claim that floating images are safe or compatible.
- Verified the shell example's option names, quoting, environment assignment, and archive-list command against PostgreSQL documentation. The password file must have restrictive permissions on Unix. Archive listing is only an inspection step, not proof of a successful full restore.
- Verified ClickHouse DATABASE and Disk backup syntax, ZIP destinations, required disk configuration, and backup status tables. The sample database and disk names are explicitly deployment-specific. A new backup destination name is needed for subsequent runs because an existing backup is not overwritten.
- PostgreSQL stores application state, while ClickHouse stores telemetry. The chart documents operator backup workflows and optional object-store destinations. ENCRYPTION_SECRET is present in the pinned configuration and used by the encryption implementation.
- The original ClickHouse documentation URL resolves to the current backup overview; it remains a valid resource. Pinned GitHub resources were retrieved through their raw-content equivalents when the web fetch failed.
- Commands were reviewed against official documentation and source; no live database backup or restore was performed. Actual recovery success, permissions, storage access, cluster coverage, retention, and recovery objectives must be proven in the deployment's isolated restore rehearsal.
