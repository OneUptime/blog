# How to Back Up and Restore Self-Hosted Sentry Across PostgreSQL, ClickHouse, and Object Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Sentry, Backup, PostgreSQL, ClickHouse, Disaster Recovery

Description: Plan and verify a consistent self-hosted Sentry backup that includes configuration, databases, event storage, and external object dependencies.

---

A Sentry backup is incomplete if it restores user accounts but loses event history, or restores database rows whose attachments and debug files no longer exist. PostgreSQL, ClickHouse, broker state, configuration, and file storage form one recovery system even when each has a different backup mechanism.

The first decision is what you intend to recover: configuration only, historical events, or historical events plus in-flight ingestion. Write that scope down before selecting backup commands.

## Understand what Sentry's JSON export contains

Sentry's supported partial export covers low-volume application data such as users, organizations, projects, and configuration. It deliberately excludes high-volume history and references to external files. It is useful for inspection and configuration recovery, but it is not a complete disaster-recovery backup. See [Sentry Backup & Restore](https://develop.sentry.dev/self-hosted/backup/).

On supported modern self-hosted versions, the administrative export can be invoked as:

```bash
./sentry-admin.sh export global /path/to/protected/export.json
```

Check `./sentry-admin.sh export --help` for your installed version and encryption options. Protect the export as sensitive data because administrative accounts, authorization data, and configuration are part of its purpose.

Sentry documents full Docker-volume backup as an alternative, while explicitly describing that flow as not officially supported. A full backup strategy therefore needs your own restore testing and operational ownership.

## Inventory all persistence before the first backup

A typical inventory includes:

| Component | Recovery concern |
| --- | --- |
| PostgreSQL | Application records, relationships, and schema state |
| ClickHouse | Event and analytics datasets |
| Kafka and other queues | Retained or in-flight processing state |
| Sentry file storage | Artifacts, attachments, and other persisted files |
| External object storage | Referenced objects, versions, credentials, and keys |
| Configuration | Release tag, secrets, Compose overrides, and storage settings |

The exact volume set depends on the release and enabled features. Do not assume a short list copied from an old installation covers a newer one.

```bash
docker compose config --services
docker compose config --volumes
docker compose ps -aq | xargs docker inspect \
  --format '{{range .Mounts}}{{if eq .Type "volume"}}{{println .Name}}{{end}}{{end}}' \
  | sort -u > sentry-volume-names.txt
```

Inspect bind mounts separately and compare the discovered names with your effective Compose configuration. Containers that have never been created will not appear in the inspection output. Record external databases and buckets because they will not appear as Docker volumes at all.

## Choose one consistent recovery boundary

For a modest single-host installation, a planned cold backup is often easier to reason about than separate live snapshots. Block new ingestion and administrative writes, allow consumers to drain if practical, record outstanding lag, and stop the stack cleanly before taking storage snapshots.

```bash
# Run only during the planned backup maintenance window.
docker compose stop --timeout 120
```

Confirm that services actually stopped before copying their data. Snapshot or archive every required volume and bind mount while the system remains quiescent. Docker's [volume backup guidance](https://docs.docker.com/engine/storage/volumes/#back-up-restore-or-migrate-data-volumes) describes mounting volumes into a temporary container for archive operations.

For example, this archives one already-stopped PostgreSQL volume. Repeat the established procedure for every volume in the approved inventory:

```bash
# Replace these with the inspected volume and a protected absolute path.
backup_root=/srv/backups/sentry/2026-09-14
postgres_volume=sentry-postgres
mkdir -p "$backup_root"

docker run --rm \
  --mount "type=volume,src=$postgres_volume,dst=/source,readonly" \
  --mount "type=bind,src=$backup_root,dst=/backup" \
  alpine:3.22 \
  tar -czpf /backup/postgres-volume.tar.gz -C /source .
```

Pin the helper image according to your deployment policy. Preserve ownership and permissions when restoring, and use compatible datastore image versions. A physical PostgreSQL volume is not a portable backup that can simply be opened by an arbitrary PostgreSQL major version.

## Use database-native backups when live recovery is required

For PostgreSQL, `pg_dump` creates a consistent logical snapshot of one database, but roles and other cluster-wide objects require separate handling. A dump taken while ClickHouse and file storage continue changing does not establish a consistent cross-service restore point. See the [PostgreSQL SQL dump documentation](https://www.postgresql.org/docs/current/backup-dump.html).

For ClickHouse, use the version's supported `BACKUP` and `RESTORE` facilities or your tested storage-snapshot process. Account for database definitions, data, users or access configuration as applicable, backup destination configuration, and encrypted storage dependencies. The official [ClickHouse backup guide](https://clickhouse.com/docs/operations/backup) documents supported targets and restoration behavior.

Do not mix a fresh PostgreSQL dump, a week-old ClickHouse snapshot, and today's bucket contents and call the result consistent. If your recovery design permits such skew, document what records or events may be absent and test those exact conditions.

## Include external object storage and key material

An external bucket needs its own recovery mechanism. Record bucket names, prefixes, object version boundaries, encryption-key dependencies, and the application configuration that references them. If lifecycle rules delete objects, the backup policy must retain recoverable versions for at least the intended recovery window.

S3 Versioning preserves multiple object versions and can assist recovery from overwrite or deletion, but it does not replace a tested restore procedure or independent backup policy. See [Amazon S3 Versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html).

A simple synchronization of current objects is not a point-in-time history. It may also propagate deletions when configured that way. Coordinate object recovery with the database backup boundary, and verify that the restored service can decrypt and retrieve the selected objects.

## Restore into an isolated environment first

Provision the same Sentry release and compatible component images using the backed-up configuration. Keep ingestion and notification integrations disabled until verification completes. Restore volumes or databases using the matching method, restore external objects and secrets, and then start the stack.

For partial JSON recovery, Sentry recommends the same Sentry version on a fresh migrated database. Do not import the partial export over a complete restored production database as an extra safety step; imports can replace existing data.

Test more than login:

1. Open an old issue and inspect several historical events.
2. Retrieve a known attachment and confirm a symbolicated stack trace still works.
3. Search a historical time range backed by ClickHouse.
4. Submit a new synthetic event and verify end-to-end ingestion.
5. Exercise an alert through a controlled destination before restoring normal routing.

Record checksums, backup start and completion times, release and image versions, data lag at the boundary, and measured restore duration. The result should tell an operator which backup set can recover which period, and how long recovery actually takes.

## References

- [Sentry backup scope and restore behavior](https://develop.sentry.dev/self-hosted/backup/)
- [Docker volume backups](https://docs.docker.com/engine/storage/volumes/)
- [PostgreSQL logical backups](https://www.postgresql.org/docs/current/backup-dump.html)
- [ClickHouse backups](https://clickhouse.com/docs/operations/backup)
- [S3 object versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html)
