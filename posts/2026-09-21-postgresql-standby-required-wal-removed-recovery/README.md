# How to Recover a PostgreSQL Standby After Its Required WAL Has Been Removed

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Replication, Disaster Recovery, Troubleshooting

Description: Recover a PostgreSQL physical standby from a complete WAL archive or rebuild it from a fresh base backup when the required WAL chain is gone.

The message `requested WAL segment ... has already been removed` means a standby needs a piece of history its upstream server no longer has. Restarting the standby or increasing retention cannot recreate that history. First determine whether an archive contains the complete missing chain. If it does not, rebuild the standby from a new base backup.

The examples target PostgreSQL 18 physical replication on servers you administer. A Patroni, Kubernetes operator, or managed-service deployment should use its controller's reinitialize or recovery workflow so the controller does not undo manual changes.

## Preserve the information that chooses the recovery path

Keep the exact missing segment name, standby logs, upstream identity, and timeline history. Confirm the server is still a standby:

```sql
-- Standby, if it accepts read-only connections
SELECT pg_is_in_recovery(),
       pg_last_wal_receive_lsn(),
       pg_last_wal_replay_lsn();

SHOW primary_slot_name;
SHOW restore_command;
```

On the primary, inspect the slot used by that standby:

```sql
SELECT slot_name, active, restart_lsn, wal_status,
       safe_wal_size, invalidation_reason
FROM pg_replication_slots
WHERE slot_name = 'reporting_standby';
```

A `lost` WAL status means the slot is unusable. `wal_removed` identifies lost required WAL; PostgreSQL 18 can also report `idle_timeout`. These are separate causes requiring separate prevention controls. See the [replication slot view](https://www.postgresql.org/docs/18/view-pg-replication-slots.html).

Check the primary's recent failover history before retrieving files. A file with a similar sequence number from an unrelated cluster is not a substitute. Physical replication requires compatible cluster history and the same major version; [standby planning](https://www.postgresql.org/docs/18/warm-standby.html) also recommends keeping release levels aligned.

## Use the archive when the entire chain exists

A standby can obtain WAL from an archive, its local `pg_wal`, and streaming replication. After it consumes available archive data, it can return to streaming. An archive therefore provides a second recovery path when the primary has recycled old segments.

Use the archive system's tested restore command. For an uncompressed, securely mounted local archive, a minimal example is:

```conf
restore_command = 'cp /srv/pg-wal-archive/%f %p'
```

The PostgreSQL operating-system user must be able to read the archive. A missing file must produce a nonzero exit status; do not add a success fallback that creates an empty destination. Compressed or remote archives require their corresponding restore tool. The [continuous archiving guide](https://www.postgresql.org/docs/18/continuous-archiving.html) explains the restore placeholders and failure behavior.

Restore access to all required segments and timeline history, then restart or reload through your normal standby procedure as appropriate for the changed settings. Watch replay advance through the previously missing segment. One recovered file is insufficient if the next segment is also gone.

If the old physical slot is invalid, replace it through a controlled slot rotation before relying on streaming retention again. Keep archive coverage available during that transition. A new physical slot protects WAL only once it reserves an LSN; `pg_create_physical_replication_slot` reserves it on the first streaming connection unless `immediately_reserve` is true. It does not restore already deleted WAL.

## Rebuild when the chain is incomplete

Remove the failed standby from read traffic and automatic promotion. Stop its PostgreSQL service and preserve its old data directory for investigation according to your storage policy. Do not run a base backup into a running or populated data directory.

The following command runs on the standby host as its PostgreSQL operating-system user. `/srv/postgresql/18/rebuild` must be an empty, correctly owned destination. The named slot must not already exist:

```bash
pg_basebackup \
  --host=primary.example.internal \
  --username=standby_replicator \
  --pgdata=/srv/postgresql/18/rebuild \
  --format=plain \
  --wal-method=stream \
  --write-recovery-conf \
  --create-slot \
  --slot=reporting_standby_rebuild \
  --progress
```

Use a protected password file or established certificate authentication. With this combination, `pg_basebackup` creates a permanent physical slot, streams the backup's required WAL, and writes standby connection configuration. Review the [pg_basebackup options](https://www.postgresql.org/docs/18/app-pgbasebackup.html), including tablespace mappings if your cluster uses tablespaces.

Configure the service to use the rebuilt directory and review copied configuration for host-specific paths. Check recovery-sensitive settings too: standby values for `max_connections`, `max_worker_processes`, `max_wal_senders`, `max_prepared_transactions`, and `max_locks_per_transaction` must be at least the primary values. Startup-command overrides on the primary are not necessarily present in the copied configuration. See [hot standby configuration](https://www.postgresql.org/docs/18/hot-standby.html), then start the rebuilt server as a standby. Keep the previous directory intact until the new copy is verified. If the backup fails, inspect whether it left the permanent slot behind; remove only the confirmed abandoned slot so it cannot retain WAL indefinitely.

## Verify data replay before restoring traffic

On the rebuilt standby:

```sql
SELECT pg_is_in_recovery(),
       pg_last_wal_receive_lsn(),
       pg_last_wal_replay_lsn();

SELECT status, sender_host, slot_name, flushed_lsn
FROM pg_stat_wal_receiver;
```

On the primary, confirm the expected connection and progressing replay position in `pg_stat_replication`. The [statistics documentation](https://www.postgresql.org/docs/18/monitoring-stats.html) defines these views. Commit a small application-level canary on the primary and confirm it becomes visible on the standby before returning read traffic.

Finally, close the retention gap that caused the incident. Size retention against peak WAL production and supported outage duration, test archive restores, and alert on slot headroom and disk space. Retain the missing-segment evidence in the incident record so an archive failure, an undersized limit, and an expired idle slot do not all receive the same ineffective fix.
