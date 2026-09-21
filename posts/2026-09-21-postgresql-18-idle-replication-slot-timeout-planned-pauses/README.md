# How to Use PostgreSQL 18 idle_replication_slot_timeout Without Invalidating Planned Pauses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Replication, Monitoring, High Availability

Description: Configure PostgreSQL 18 idle replication slot expiration around maintenance windows, and distinguish idle invalidation from WAL retention failures.

A subscription paused for a weekend can become unrecoverable even when the publisher has plenty of disk space. PostgreSQL 18 adds `idle_replication_slot_timeout`, so a maintenance runbook must account for elapsed inactivity as well as retained WAL. The useful policy is a timeout longer than every supported pause, with an explicit exception before unusually long maintenance starts.

This guide targets PostgreSQL 18. Run publisher queries as a monitoring role with sufficient catalog visibility, and configuration changes as the database administrator. For managed services, use the provider's equivalent parameter controls.

## Understand what starts the clock

The timeout measures how long a slot has gone unused by a replication connection. Its default is `0`, meaning disabled; an unqualified numeric value means seconds. Expiration is checked during checkpoints, so reaching the threshold does not imply immediate invalidation. Slots that do not reserve WAL and synchronized standby slots are excluded. These details come from the [PostgreSQL 18 replication settings](https://www.postgresql.org/docs/18/runtime-config-replication.html).

A connected consumer with little traffic is different from a disconnected consumer. Do not calculate slot inactivity from the last application transaction or from a replication-lag graph.

Before changing anything, inspect the publisher:

```sql
SELECT name, setting, unit, context, source, pending_restart
FROM pg_settings
WHERE name IN (
    'idle_replication_slot_timeout',
    'max_slot_wal_keep_size',
    'checkpoint_timeout'
);

SELECT slot_name, slot_type, active, inactive_since,
       clock_timestamp() - inactive_since AS inactive_for,
       restart_lsn, wal_status, safe_wal_size,
       invalidation_reason, synced
FROM pg_replication_slots
ORDER BY inactive_since NULLS LAST;
```

An invalid slot can still have an `inactive_since` timestamp; the timestamp stops updating after invalidation. Use `invalidation_reason` to distinguish `idle_timeout` from `wal_removed`. The [slot view documentation](https://www.postgresql.org/docs/18/view-pg-replication-slots.html) defines both fields.

## Set a policy that includes real maintenance

Suppose the longest normal outage is 36 hours, with another 12 hours allowed for repair and backlog consumption. A 72-hour threshold gives additional operational room. That number is an example derived from this workload, not a PostgreSQL recommendation.

Record the previous setting and its configuration source. Then apply the reviewed value:

```sql
ALTER SYSTEM SET idle_replication_slot_timeout = '72h';
SELECT pg_reload_conf();
```

Run `SHOW idle_replication_slot_timeout;` in a fresh session after the reload. `ALTER SYSTEM` writes `postgresql.auto.conf`; it must run outside a transaction block. Configuration management should own the resulting value so a later deployment does not silently revert it. See [ALTER SYSTEM](https://www.postgresql.org/docs/18/sql-altersystem.html).

Alert before the threshold, for example at 48 hours, and route that alert to the owner of the named consumer. Include maintenance ownership, intended resume time, and available disk capacity. Alerting on every inactive slot without ownership quickly becomes noise.

## Prepare for a longer planned pause

For a five-day pause, raise the timeout sufficiently **before disconnecting the consumer**, or temporarily disable it:

```sql
ALTER SYSTEM SET idle_replication_slot_timeout = '0';
SELECT pg_reload_conf();
```

This is a cluster-wide exception, not a per-slot exemption. Record an expiry task and inspect other inactive slots during the exception. Do not rely on the delay until the next checkpoint as a grace period.

When the subscriber resumes, confirm that its slot is active and has no invalidation reason. For logical replication, also confirm that the subscription's table states are ready and a newly committed source change arrives. Only then restore the previously approved timeout. If another slot has already been idle longer than that restored value, it becomes eligible for invalidation at a subsequent checkpoint.

## Budget WAL separately

Turning off idle expiration does not protect a slot from a WAL retention limit. Estimate peak WAL generation during the entire pause, add recovery time, and reserve disk headroom. A sustained 20 MiB/s produces roughly 1.65 TiB per day; a five-day outage cannot be planned around a small retention allowance.

This publisher query estimates how far the oldest required WAL position trails current WAL:

```sql
SELECT slot_name,
       pg_size_pretty(pg_wal_lsn_diff(
           pg_current_wal_lsn(), restart_lsn
       )) AS wal_distance
FROM pg_replication_slots
WHERE restart_lsn IS NOT NULL;
```

It is a WAL-position distance, not a sum of independently allocated disk files for each slot. PostgreSQL's [WAL administration functions](https://www.postgresql.org/docs/18/functions-admin.html) document the LSN functions used here. Monitor actual filesystem capacity alongside it.

## Recover without hiding the gap

If a slot already reports `idle_timeout`, increasing the timeout does not restore it. Preserve the failure evidence and determine the consumer's recovery procedure. A physical standby may recover through a complete archive chain; a logical subscriber generally needs a new consistent seed and a new slot when continuity is lost.

Do not create a fresh slot under the old name and assume the subscriber has received the missing changes. Before reopening reads or a migration cutover, prove that the consumer's data and its retained change stream share a consistent boundary. The maintenance policy has succeeded only when the pause ends with both a usable slot and verified data.
