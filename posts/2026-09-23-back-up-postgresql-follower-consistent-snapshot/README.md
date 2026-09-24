# How to Back Up from a Follower Without Taking an Inconsistent Snapshot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Backup, Replication, Disaster Recovery

Description: Take and verify PostgreSQL physical or logical backups from a standby while preserving WAL requirements and proving restoreability.

---

A replica can offload backup reads from the leader, but being a replica does not make an arbitrary copy of its files consistent. A physical backup needs the database's backup protocol and the WAL required to recover it. A logical export needs a database snapshot.

This example uses PostgreSQL 18 physical streaming replication. Other databases have their own backup protocols; do not translate PostgreSQL flags into filesystem copying rules.

## Choose the artifact you need

A physical base backup covers the PostgreSQL cluster and can seed recovery or another replica. A logical `pg_dump` export covers one database and is useful for selective restore and migration. Neither a replica's presence nor a successful backup command proves that the artifact meets your recovery-point objective.

Before starting, record the source member, system identifier, PostgreSQL version, timeline, and observed receive/replay positions. Check whether the standby is intentionally delayed. An internally consistent backup can still be older than the business permits.

Use a direct connection to the selected standby so a load balancer does not change the backup source between connections. Keep credentials in a protected password file or secret integration.

## Prepare a physical standby backup

The standby must have `hot_standby` enabled, accept replication connections, have sufficient `max_wal_senders`, and allow the backup account through `pg_hba.conf`. The account needs `REPLICATION` permission or superuser rights. Keep `full_page_writes` enabled on the primary. A streaming base backup uses a connection for the copy and another for WAL streaming, so account for both alongside existing replicas. The command below also creates a temporary replication slot for WAL streaming, so the standby needs a free slot under `max_replication_slots`.

These requirements and the behavior when a standby is promoted are described in the [pg_basebackup reference](https://www.postgresql.org/docs/18/app-pgbasebackup.html). Promotion during the standby backup causes the backup to fail; discard that incomplete attempt and restart against an appropriate source.

For a cluster without additional tablespaces, run from the backup host:

```bash
pg_basebackup \
  --dbname='host=replica-1.internal user=backup sslmode=verify-full sslrootcert=/etc/postgresql/ca.pem' \
  --pgdata=/backup/postgresql/base-20260923 \
  --format=plain \
  --wal-method=stream \
  --checkpoint=spread \
  --manifest-checksums=SHA256 \
  --progress
```

Use a new, empty destination and matching major-version tools. Streaming includes the WAL needed for this base backup; it does not provide indefinite point-in-time recovery afterward. Retain continuous WAL archives and timeline history for the recovery window your policy requires, as described in [continuous archiving](https://www.postgresql.org/docs/18/continuous-archiving.html).

Additional tablespaces require explicit destination planning, such as `--tablespace-mapping`. In plain format they otherwise retain source paths, which may be inappropriate or collide with local storage. Review that layout before running the command.

## Verify files, then prove recovery

Run:

```bash
pg_verifybackup /backup/postgresql/base-20260923
```

The manifest check catches missing, altered, and corrupt files and checks required WAL for a plain-format backup. The [verification documentation](https://www.postgresql.org/docs/18/app-pgverifybackup.html) explicitly states that these checks do not replace a test restore.

Copy the verified artifact into an isolated restore environment. Inspect copied settings, recovery signal files, connection strings, archive commands, tablespace paths, and listening addresses before startup. Ensure the restored server cannot contact production or write into the production WAL archive. Restore the separately managed configuration and credentials through your normal recovery procedure.

Start recovery with the matching server major version, inspect the recovery log, and check application invariants and expected data markers. For point-in-time recovery, test an explicit target covered by your retained WAL rather than only starting the base backup.

## Use a consistent logical export when appropriate

For a logical export from a hot standby:

```bash
pg_dump \
  --dbname='host=replica-1.internal dbname=app user=backup sslmode=verify-full sslrootcert=/etc/postgresql/ca.pem' \
  --format=custom \
  --file=/backup/postgresql/app-20260923.dump
```

Grant the account access to the objects being exported. [pg_dump](https://www.postgresql.org/docs/18/app-pgdump.html) provides a consistent database export while other sessions continue working. It does not include cluster-wide roles, all databases, or a continuous WAL history. When dumping from a standby, it also excludes data in unlogged tables and sequences, although their definitions are included. Restore global dependencies separately and test with `pg_restore` into an isolated database.

On a standby, a long export may conflict with WAL replay. PostgreSQL's [hot standby documentation](https://www.postgresql.org/docs/18/hot-standby.html) explains query cancellation and recovery conflicts. Increasing standby delay settings or enabling feedback changes the tradeoff: it can increase replica lag or retain dead tuples on the primary. Treat those as workload decisions, not automatic backup fixes.

## Publish only completed, tested artifacts

Keep an in-progress location separate from the catalog of usable backups. Publish the artifact only after the command succeeds and verification completes. Record restore-test status separately so operators can distinguish file integrity from demonstrated recovery.

Alert on backup age, source lag, verification failures, missing WAL coverage, and restore-test age. Offloading the copy to a follower protects leader capacity; the restore evidence is what makes the backup useful.
