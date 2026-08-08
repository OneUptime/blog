# Diagnose PostgreSQL Logical Subscription Initial Synchronization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Logical Replication, Subscription, Initial Sync, COPY, Troubleshooting

Description: Trace a logical subscription stuck during initialization from per-table state through workers, slots, permissions, schema, locks, and capacity.

---

A PostgreSQL logical subscription does not initialize as one indivisible job. It creates a main apply worker, starts dedicated table synchronization workers, takes snapshots, copies existing rows, catches each table up with changes generated during its copy, and finally hands that table to normal apply.

That architecture is why a subscription can appear healthy for some tables and permanently stuck for another. Diagnose it table by table. The important evidence is the relation state in `pg_subscription_rel`, current workers in `pg_stat_subscription`, PostgreSQL logs on both nodes, and the main plus additional table-synchronization slots on the publisher.

## Translate the Internal Table States

Run this on the subscriber database that owns the subscription:

```sql
SELECT s.subname,
       n.nspname AS schema_name,
       c.relname AS table_name,
       r.srsubstate,
       CASE r.srsubstate
           WHEN 'i' THEN 'initialize'
           WHEN 'd' THEN 'data is being copied'
           WHEN 'f' THEN 'finished table copy'
           WHEN 's' THEN 'synchronized'
           WHEN 'r' THEN 'ready'
       END AS state,
       r.srsublsn
FROM pg_subscription_rel AS r
JOIN pg_subscription AS s ON s.oid = r.srsubid
JOIN pg_class AS c ON c.oid = r.srrelid
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE s.subname = 'orders_sub'
ORDER BY r.srsubstate, n.nspname, c.relname;
```

PostgreSQL 18 documents these codes:

- `i`: the relation is initializing;
- `d`: existing data is being copied;
- `f`: the table copy finished;
- `s`: the table synchronized with changes that occurred during the copy;
- `r`: the table is ready for normal replication.

`srsublsn` is meaningful for synchronization coordination in `s` or `r`; it is normally `NULL` in earlier states. Do not update this system catalog manually to force a table to `r`. The state coordinates snapshots, table-synchronization slots, and the main apply worker. Forging it can silently omit data.

Count states to see whether the problem is global or isolated:

```sql
SELECT r.srsubstate, count(*)
FROM pg_subscription_rel AS r
JOIN pg_subscription AS s ON s.oid = r.srsubid
WHERE s.subname = 'orders_sub'
GROUP BY r.srsubstate
ORDER BY r.srsubstate;
```

A large table can legitimately remain in `d` for hours. It is stuck only when there is no meaningful progress for the workload, logs show repeated failure, or the expected worker repeatedly disappears.

## Find the Worker Responsible

Current PostgreSQL exposes the worker type directly. Because `pg_subscription` is cluster-shared and subscription names only need to be unique within a database, resolve the current database's subscription OID when filtering the shared statistics view:

```sql
SELECT subname,
       worker_type,
       pid,
       leader_pid,
       relid::regclass AS relation,
       received_lsn,
       latest_end_lsn,
       last_msg_send_time,
       last_msg_receipt_time
FROM pg_stat_subscription
WHERE subid = (
    SELECT oid
    FROM pg_subscription
    WHERE subname = 'orders_sub'
      AND subdbid = (
          SELECT oid
          FROM pg_database
          WHERE datname = current_database()
      )
)
ORDER BY worker_type, (relid::regclass)::text NULLS FIRST, pid;
```

Normally an enabled subscription has one leader apply worker. During initial copy it can also have table synchronization workers, and a subscription using parallel streaming can have parallel apply workers. On PostgreSQL 18, a disabled subscription or one whose worker keeps crashing still has a placeholder row with null worker fields, notably a null `pid`.

On older supported releases, the exact columns differ. Check that release's `pg_stat_subscription` documentation instead of deploying a current-version query unchanged. Where `worker_type` is unavailable, a non-null `relid` identifies a table synchronization worker in older layouts.

Use the worker PID to inspect its wait state on the subscriber:

```sql
SELECT pid,
       backend_type,
       state,
       wait_event_type,
       wait_event,
       xact_start,
       query_start,
       query
FROM pg_stat_activity
WHERE pid IN (
    SELECT pid
    FROM pg_stat_subscription
    WHERE subid = (
        SELECT oid
        FROM pg_subscription
        WHERE subname = 'orders_sub'
          AND subdbid = (
              SELECT oid
              FROM pg_database
              WHERE datname = current_database()
          )
    )
);
```

A lock wait, socket wait, disk-heavy active copy, and absent process require different remedies. Sample the view over time rather than deciding from one snapshot.

## Read Error Counters and Logs Together

On PostgreSQL 18, subscriber counters distinguish initial synchronization errors from apply errors:

```sql
SELECT subname,
       apply_error_count,
       sync_error_count,
       stats_reset
FROM pg_stat_subscription_stats
WHERE subid = (
    SELECT oid
    FROM pg_subscription
    WHERE subname = 'orders_sub'
      AND subdbid = (
          SELECT oid
          FROM pg_database
          WHERE datname = current_database()
      )
);
```

Counters prove that failures occurred; they do not contain the relation, SQLSTATE, or first cause. Preserve subscriber logs around each increase. With the default `disable_on_error = false`, a synchronization worker that fails is automatically respawned, so a repeating error may look like periodic activity without progress. With `disable_on_error = true`, an error disables the subscription instead.

Also read publisher logs. Connection rejection, replication-slot exhaustion, missing `SELECT` privilege, row-security behavior, and WAL sender termination are often clearer there.

## Inspect Main and Table Synchronization Slots

Each active subscription uses one logical slot on the publisher. Initial synchronization creates additional table-synchronization slots whose generated names follow the documented `pg_<subscription_oid>_sync_<relation_oid>_<system_identifier>` pattern; all three generated identifiers are subscriber-side. Although transient in lifecycle, PostgreSQL 18 creates these as permanent slots (`temporary = false`) and drops them when synchronization finishes.

On the subscriber, first record the main slot name and subscription OID:

```sql
SELECT oid AS subscription_oid,
       subname,
       subenabled,
       subslotname,
       subpublications
FROM pg_subscription
WHERE subname = 'orders_sub'
  AND subdbid = (
      SELECT oid
      FROM pg_database
      WHERE datname = current_database()
  );
```

Then inspect slots on the publisher. This query targets PostgreSQL 18 and assumes the default main slot name; if `subslotname` differs, replace `'orders_sub'` with the value returned above. On older releases, select only columns available in that release:

```sql
SELECT slot_name,
       slot_type,
       database,
       temporary,
       active,
       active_pid,
       restart_lsn,
       confirmed_flush_lsn,
       wal_status,
       safe_wal_size,
       inactive_since,
       invalidation_reason
FROM pg_replication_slots
WHERE slot_name = 'orders_sub'
   OR slot_name LIKE 'pg\_%\_sync\_%' ESCAPE '\'
ORDER BY slot_name;
```

The wildcard query can include synchronization slots for other subscriptions. Correlate generated identifiers and active PIDs before acting. Never drop a synchronization slot simply because it looks old while the subscription still owns it. First determine why its worker is not finishing.

Check publisher capacity as well:

```sql
SHOW max_wal_senders;
SHOW max_replication_slots;

SELECT count(*) AS used_slots
FROM pg_replication_slots;

SELECT count(*) AS active_wal_senders
FROM pg_stat_replication;
```

The main slot and concurrent table-copy slots need replication-slot capacity; their connections need WAL sender capacity.

## Failure Class 1: Missing or Incompatible Subscriber Schema

Logical replication does not create tables or copy DDL. Every published target must already exist under the same fully qualified name. Columns match by name, and incoming textual values must be convertible to subscriber types unless binary transfer imposes stricter requirements.

Compare the actual definitions:

```sh
pg_dump --schema-only --no-owner --no-privileges \
  --table=public.orders publisher_db > publisher-orders-schema.sql

pg_dump --schema-only --no-owner --no-privileges \
  --table=public.orders subscriber_db > subscriber-orders-schema.sql
```

Inspect rather than applying one dump over the other automatically. Subscriber-only indexes, permissions, and constraints may be intentional.

Typical copy failures include:

- the subscriber table or column does not exist;
- a source value cannot be converted to the subscriber type;
- a subscriber `NOT NULL`, check, or unique constraint rejects copied rows;
- a generated expression or default depends on a missing function or extension;
- an existing subscriber row collides with copied primary or unique keys;
- `binary = true` encounters incompatible type send/receive support across versions.

Initial copy does not truncate the subscriber table. `copy_data = true` into pre-populated targets can therefore raise duplicate-key errors or mix unrelated rows. Decide which dataset is authoritative before deleting anything.

## Failure Class 2: Trigger Side Effects

Logical apply and table synchronization both run with `session_replication_role = replica`, so ordinary triggers and rules do not fire. Normal apply can fire eligible row triggers but not statement triggers. Initial table synchronization is implemented like `COPY` and can fire both row and statement triggers for `INSERT`, but only when those triggers are configured `ENABLE REPLICA` or `ENABLE ALWAYS`.

Inventory subscriber triggers on the stuck table:

```sql
SELECT t.tgname,
       t.tgenabled,
       pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger AS t
WHERE t.tgrelid = 'public.orders'::regclass
  AND NOT t.tgisinternal
ORDER BY t.tgname;
```

Such a trigger can call a missing function, reject a row, write to another constrained table, or make the copy unexpectedly expensive. Do not disable it reflexively. Determine whether its semantics are required during initial load, then use a reviewed maintenance change and restore the intended trigger mode afterward.

## Failure Class 3: Publisher Permissions or Row Security

The connection role needs `LOGIN` and a matching `pg_hba.conf` rule. Unless it is a superuser, it also needs `REPLICATION`, `CONNECT` on the publisher database, `USAGE` on each containing schema, and `SELECT` on every table whose initial contents it copies. On the publisher:

```sql
SELECT rolname, rolsuper, rolcanlogin, rolreplication, rolbypassrls
FROM pg_roles
WHERE rolname = 'logical_replicator';

SELECT has_database_privilege(
           'logical_replicator', current_database(), 'CONNECT'
       ) AS can_connect,
       has_schema_privilege(
           'logical_replicator', 'public', 'USAGE'
       ) AS can_use_orders_schema,
       has_table_privilege(
           'logical_replicator', 'public.orders', 'SELECT'
       ) AS can_copy_orders;
```

If a non-superuser role lacks `BYPASSRLS`, publisher row-security policies can execute. PostgreSQL recommends considering `options=-crow_security=off` when the replication role does not trust every table owner; that makes the session stop instead of unexpectedly applying a newly added row-security policy. Treat any connection-string change as sensitive because `pg_subscription.subconninfo` can contain credentials.

Subscriber apply permissions also matter. Current PostgreSQL normally switches to each target table owner to apply DML, so the subscription owner must be able to `SET ROLE` appropriately. `run_as_owner = true` changes that model and has documented security consequences; it is not a generic permission-error workaround.

## Failure Class 4: Worker Exhaustion

On the subscriber, table sync workers draw from both the logical replication worker limit and the general background worker pool:

```sql
SHOW max_worker_processes;
SHOW max_logical_replication_workers;
SHOW max_sync_workers_per_subscription;
SHOW max_parallel_apply_workers_per_subscription;
```

PostgreSQL 18 also limits active replication origins separately:

```sql
SHOW max_active_replication_origins;
```

`max_logical_replication_workers` includes leader apply workers, table synchronization workers, and parallel apply workers. Increasing only `max_sync_workers_per_subscription` cannot create capacity in the other pools. On PostgreSQL 18, `max_active_replication_origins` must cover the subscriptions plus reserve for table synchronization; on earlier releases, `max_replication_slots` provides this subscriber-side limit. Some parameters require a server restart, so confirm their context with `pg_settings` and plan the change.

Worker limits normally reduce parallelism rather than corrupting state, but an undersized pool shared across several subscriptions can make tables wait in `i` much longer than expected. Logs typically report failure to obtain a worker when exhaustion is the cause.

## Failure Class 5: Locks, Storage, or Network Throughput

For a worker waiting on a lock, identify blockers:

```sql
SELECT a.pid,
       a.wait_event_type,
       a.wait_event,
       pg_blocking_pids(a.pid) AS blocking_pids,
       a.query
FROM pg_stat_activity AS a
WHERE a.pid IN (
    SELECT pid
    FROM pg_stat_subscription
    WHERE subid = (
        SELECT oid
        FROM pg_subscription
        WHERE subname = 'orders_sub'
          AND subdbid = (
              SELECT oid
              FROM pg_database
              WHERE datname = current_database()
          )
    )
);
```

Investigate the blocking transaction rather than terminating it automatically. A schema migration may be protecting an important invariant.

When the worker is active, measure changing bytes, rows, disk utilization, WAL generation, and timestamps over a real interval. A large table with indexes and subscriber-side trigger work may be slow without being stuck. Initial copies run in parallel only up to configured limits and each table has at most one synchronization worker.

Check filesystem space on both nodes. The publisher retains WAL through replication slots while the copy proceeds, and the subscriber needs table, index, temporary, and WAL space. Network resets often appear as repeated worker starts and changing connection timestamps.

## Choose a Recovery That Preserves the Snapshot Contract

For a transient connection or resource error, fix the cause and allow PostgreSQL to respawn the synchronization worker. For schema, permission, trigger, or data conflicts, correct the exact issue and observe the retry. If `disable_on_error = true` disabled the subscription, re-enable it only after repairing the cause.

Avoid these shortcuts:

- changing `pg_subscription_rel` state by hand;
- dropping generated sync slots while their subscription exists;
- assuming `ALTER SUBSCRIPTION ... REFRESH PUBLICATION` recopies a previously subscribed table;
- repeatedly deleting whichever subscriber row appears in the next error without deciding data ownership;
- using `ALTER SUBSCRIPTION ... SKIP` for an initial copy problem.

The documentation explicitly says refresh does not copy previously subscribed tables, even if a row filter changed. If one table must be completely re-seeded, design a controlled rebuild: fence relevant writes, preserve or recreate the required publication/slot continuity, clear the target safely, and use a tested subscription or independent consistent-copy procedure. For widespread uncertainty, rebuilding the subscription is safer than inventing catalog surgery, but remember that dropping and recreating it loses synchronization state and can require a full recopy.

## Define Completion

Initialization is complete only when all of these hold:

```sql
SELECT count(*) AS tables_not_ready
FROM pg_subscription_rel AS r
JOIN pg_subscription AS s ON s.oid = r.srsubid
WHERE s.subname = 'orders_sub'
  AND r.srsubstate <> 'r';
```

- every expected table is present and in `r` state;
- the enabled subscription has a stable apply worker;
- synchronization and apply error counters stop increasing;
- generated table synchronization slots are gone from the publisher;
- the main slot and apply positions advance under new writes;
- representative key and aggregate checks agree for every published table.

Row counts alone are not sufficient for filtered publications, actively changing tables, or divergent subscriber-only rows. Validate according to the publication's actual row filters and column lists.

## Official Documentation

- [PostgreSQL logical replication architecture and initial snapshot](https://www.postgresql.org/docs/current/logical-replication-architecture.html)
- [PostgreSQL `pg_subscription_rel` catalog](https://www.postgresql.org/docs/current/catalog-pg-subscription-rel.html)
- [PostgreSQL logical replication monitoring](https://www.postgresql.org/docs/current/logical-replication-monitoring.html)
- [PostgreSQL subscription statistics views](https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-SUBSCRIPTION)
- [PostgreSQL logical replication security](https://www.postgresql.org/docs/current/logical-replication-security.html)
- [PostgreSQL replication configuration](https://www.postgresql.org/docs/current/runtime-config-replication.html)
- [PostgreSQL `ALTER SUBSCRIPTION`](https://www.postgresql.org/docs/current/sql-altersubscription.html)

## Conclusion

An initializing subscription is a collection of per-table state machines, not one progress bar. Map each table's state, find its worker and wait event, correlate logs and publisher slots, and then test schema, triggers, permissions, capacity, locks, storage, and transport in that order. Repair the cause and let PostgreSQL preserve its snapshot coordination; never promote a catalog row to `ready` by hand.
