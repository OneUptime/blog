# Fix CloudNativePG WAL Growth: Retention, Upload Failures, and Orphaned Backups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudNativePG, PostgreSQL, WAL Archiving, Backup, Retention, Troubleshooting

Description: Separate local WAL accumulation from object-store growth, then diagnose upload failures, replication slots, retention windows, and abandoned archive prefixes.

---

“WAL is growing” describes at least two different incidents. The PostgreSQL volume can fill with WAL waiting to be archived or retained for replication, while an object-store archive can grow because its recoverability window, retention process, or bucket versions keep objects alive. First identify which bytes are growing.

This guide uses CloudNativePG 1.30 with the Barman Cloud plugin and its `ObjectStore` resource. Avoid copying in-tree retention settings into a plugin deployment: the configuration owner changed.

## Distinguish local storage from archived objects

Record usage separately for the data PVC, a dedicated WAL PVC if present, and the backup bucket. In Kubernetes:

```bash
kubectl cnpg status orders -n database
kubectl get pvc -n database -l cnpg.io/cluster=orders
kubectl get objectstore orders-archive -n database -o yaml
kubectl get scheduledbackups.postgresql.cnpg.io,backups.postgresql.cnpg.io -n database
```

On the primary, use an authorized PostgreSQL session:

```sql
SELECT archived_count, last_archived_wal, last_archived_time,
       failed_count, last_failed_wal, last_failed_time, stats_reset
FROM pg_stat_archiver;

SELECT slot_name, slot_type, active, restart_lsn,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn))
         AS retained_wal
FROM pg_replication_slots;
```

The slot query is intended for the primary. A null `restart_lsn` does not mean the same thing as zero retained bytes. PostgreSQL documents the [archiver statistics](https://www.postgresql.org/docs/current/monitoring-stats.html#PG-STAT-ARCHIVER-VIEW) and [replication slot view](https://www.postgresql.org/docs/current/view-pg-replication-slots.html).

Compare counters over time and consider `stats_reset`. An old nonzero failure count can outlive the problem that caused it. On a quiet database, an old archive timestamp is not sufficient evidence that uploads are broken.

## Fix local WAL pressure at its source

Read the primary's archive sidecar logs:

```bash
kubectl logs orders-1 -n database -c plugin-barman-cloud --since=30m
```

Substitute the current primary and discover its actual container name if your plugin version differs. Look for authentication expiry, TLS validation errors, network failures, throttling, and exhausted object-store capacity. The [plugin troubleshooting guide](https://cloudnative-pg.io/plugin-barman-cloud/docs/troubleshooting/#wal-archiving-issues) identifies the relevant logs and configuration.

Correct the failing dependency and verify successful archive progress. If storage is nearly full, add capacity through the supported storage procedure while resolving the cause. Deleting files from `pg_wal` can make the database unrecoverable.

Replication slots are a separate reason for retention. An inactive slot may still protect a replica or logical consumer that must catch up. Identify its owner and recovery plan before dropping it. Dropping a slot merely to reclaim space can require rebuilding the consumer and does not repair an archive upload failure.

PostgreSQL's [continuous archiving guidance](https://www.postgresql.org/docs/current/continuous-archiving.html) explains why failed archive commands cause WAL accumulation. CloudNativePG's archive plugin configuration does not turn `max_wal_size` into a hard cap that makes required WAL disposable.

## Put retention on the correct resource

With the Barman Cloud plugin, merge this fragment into the existing `ObjectStore` specification:

```yaml
spec:
  retentionPolicy: "30d"
```

Preserve its existing `configuration` and credentials. The [plugin retention policy](https://cloudnative-pg.io/plugin-barman-cloud/docs/retention/) is a recovery window, not “delete every object older than thirty days.” A base backup preceding the window's beginning may remain necessary, together with WAL needed to recover forward from it.

Verify recent base backups actually complete. A broken schedule can leave the archive dependent on an increasingly old base backup. Increasing upload parallelism will not resolve that dependency. The plugin also provides a sidecar retention check interval; inspect your installed release's [sidecar configuration](https://cloudnative-pg.io/plugin-barman-cloud/docs/usage/#configuring-the-plugin-instance-sidecar) and logs rather than assuming an immediate cleanup after changing the policy.

Check delete authorization and any object lock or legal hold. Retention cannot erase objects that the object store refuses to delete. Keep those protections aligned with your recovery and retention requirements instead of disabling them to silence a storage alert.

## Explain bucket growth that survives cleanup

An S3 deletion in a versioned bucket can leave noncurrent versions consuming storage. Inspect current objects, noncurrent versions, incomplete multipart uploads, and delete markers separately. AWS documents these distinctions in its [versioning lifecycle guidance](https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html).

Do not impose a generic thirty-day lifecycle deletion on live WAL objects solely because Barman uses a thirty-day window. The required starting backup may be older, and a lifecycle rule does not understand the PostgreSQL recovery chain. Test the oldest promised restore point before shortening any storage policy.

For abandoned prefixes, map each archived `serverName` to its owner, last successful backup, retention obligation, and any disaster-recovery consumers. A renamed or deleted Kubernetes cluster does not prove its archive is disposable. Keep an inventory and use the supported Barman catalog and deletion workflow once the retirement decision is established.

## Confirm the repair preserved recovery

Measure local WAL usage after uploads or consumers catch up. Confirm retention logs succeed and bucket metrics change in the expected storage category. Then restore into an isolated cluster near the oldest required recovery point and another recent point.

Track archive failures, free WAL storage, backup age, first recoverability point, and restore results together. These checks identify whether growth is necessary protection, failed cleanup, or a broken recovery chain, which is the distinction needed for a durable fix.
