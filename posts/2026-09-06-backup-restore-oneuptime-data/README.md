# How to Back Up and Restore OneUptime Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OneUptime, Backup, Restore, Disaster Recovery, Object Storage

Description: Build a complete OneUptime recovery set across PostgreSQL, ClickHouse, object storage, configuration, and encryption material.

---

A OneUptime backup is not a single database dump. PostgreSQL contains monitors, incidents, projects, and configuration. ClickHouse contains telemetry. Object storage may contain database backup artifacts, while deployment configuration and encryption material determine whether the restored services can read their state.

The right unit of recovery is a documented, time-aligned recovery set.

## Define recovery objectives first

Choose a recovery point objective and recovery time objective for each data class. Configuration and active incident state may require a tighter recovery point than older telemetry. Record which loss is acceptable rather than discovering it during an outage.

Inventory the deployment:

- PostgreSQL endpoint, database, version, and backup method
- ClickHouse topology, version, disks, and backup destination
- object-store buckets used for backups
- OneUptime version, Compose files or Helm chart and values
- secrets, encryption keys, TLS material, and external integration credentials

Store the inventory securely and keep backups outside the same host, cluster, account, or failure domain.

## Back up PostgreSQL

OneUptime 12.0.33 includes a root `backup.sh` that runs `pg_dump` in custom format and writes a `db-DD.backup` file. It covers PostgreSQL only. Its day-of-month naming rotates across roughly 31 slots, so an independent backup system should copy successful artifacts to immutable or versioned storage and apply an explicit retention policy. Review the script before scheduling it: this release runs `git pull` and uses `postgres:latest`, both of which can change independently of the database backup itself.

For a managed or Kubernetes database, use a database-native managed backup or an operator-supported backup. A direct logical pattern is:

```bash
PGPASSFILE=/run/secrets/oneuptime-pgpass pg_dump \
  --format=custom \
  --host="$DATABASE_HOST" \
  --port="$DATABASE_PORT" \
  --username="$DATABASE_USERNAME" \
  --dbname="$DATABASE_NAME" \
  --file=oneuptime-postgres.backup

pg_restore --list oneuptime-postgres.backup | head
```

The PostgreSQL password file must be readable only by the backup user. Keep credentials out of shell history and process listings through that protected file or your platform's secret injection. Capture the PostgreSQL major version and use compatible client tools.

The bundled `restore.sh` uses `pg_restore --clean --if-exists`. That is destructive to matching objects in the target database. Restore first into a newly created isolated database and confirm the target host and database name before authorizing any overwrite.

## Back up ClickHouse separately

The root OneUptime backup script does not back up ClickHouse. Use ClickHouse's native `BACKUP` and `RESTORE`, a managed-service snapshot, or the operator's supported backup tooling. For example, a configured ClickHouse backup disk can receive:

```sql
BACKUP DATABASE oneuptime TO Disk('backups', 'oneuptime-2026-09-06.zip');
```

The disk and database name are deployment-specific. Configure and test the destination before using this command. In an Altinity operator deployment, the OneUptime chart documentation describes integration with `clickhouse-backup`; follow the operator and storage backend procedures for the installed versions.

Verify backup status in ClickHouse's backup system tables or managed console, record the latest telemetry timestamp, and retain the schema along with the data.

## Protect object storage and configuration

Object storage is optional in OneUptime and is used by supported database backup workflows, not as the primary telemetry store. If enabled, protect the bucket with versioning or immutability, restricted service credentials, lifecycle rules, and replication outside the cluster failure domain.

Back up these small but critical files and values too:

- `config.env` or reviewed Helm values
- referenced Kubernetes Secrets or an export from the external secret manager
- `ENCRYPTION_SECRET` and other stable application secrets
- custom certificates and DNS or ingress configuration
- an image and chart version manifest

Encrypt the recovery bundle. Losing the encryption key can be equivalent to losing the database; leaking it turns a backup into a security incident.

## Create a consistent recovery point

Independent database backups taken during heavy writes may describe different moments. For strict cross-store consistency, enter a maintenance window, stop or buffer ingestion and state-changing operations, wait for in-flight work, and then take both backups. Where brief interruption is unacceptable, accept and document the consistency gap and design reconciliation checks.

Create a manifest with backup identifiers, checksums, timestamps, versions, and the last known PostgreSQL and ClickHouse records. Do not place plaintext secrets in the manifest.

## Rehearse the full restore

Restore into an isolated network:

1. Deploy the recorded OneUptime version and dependencies.
2. Restore PostgreSQL to an empty target.
3. Restore ClickHouse and verify tables and latest timestamps.
4. Restore required object-storage artifacts and configuration secrets.
5. Start OneUptime without public traffic or outbound notifications.
6. Compare monitors, incidents, users, telemetry queries, and dashboards with the manifest.
7. Rotate any credentials exposed to the recovery environment.

Redis is not the system of record in OneUptime, so rebuild it empty unless your architecture documents a special reason otherwise.

Automate restore tests and alert on backup age, failed jobs, missing replicas, checksum failure, and unexpected size drops. A successful job log without a successful restore is not a recovery guarantee.

## Conclusion

Complete OneUptime recovery needs PostgreSQL, ClickHouse, optional object storage, deployment configuration, and stable encryption material. Back them up as one recovery set, isolate the copies from production, and regularly prove that the entire set restores.

## Official Documentation

- [OneUptime 12.0.33 PostgreSQL backup script](https://github.com/OneUptime/oneuptime/blob/12.0.33/backup.sh)
- [OneUptime 12.0.33 PostgreSQL restore script](https://github.com/OneUptime/oneuptime/blob/12.0.33/restore.sh)
- [OneUptime Helm database and backup options](https://github.com/OneUptime/oneuptime/blob/12.0.33/HelmChart/Public/oneuptime/docs/databases.md)
- [PostgreSQL pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)
- [PostgreSQL pg_restore](https://www.postgresql.org/docs/current/app-pgrestore.html)
- [ClickHouse backup and restore](https://clickhouse.com/docs/en/operations/backup)
