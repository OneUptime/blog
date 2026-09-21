# How to Lower PostgreSQL Replica max_connections in the Right Restart Order

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Replication, High Availability, Database

Description: Lower PostgreSQL max_connections on the primary first, wait for replicas to replay the new setting, and then restart replicas safely.

For physical PostgreSQL replication, lowering `max_connections` on a standby before the primary can stop recovery. The standby may encounter WAL describing a primary configuration that requires more shared-memory capacity than the standby allocated at startup.

The safe order is to lower and restart the primary first, let every standby replay beyond that change, and then lower and restart the standbys. Increasing the setting uses the reverse order. The PostgreSQL 18 hot-standby documentation explicitly describes this requirement. [Hot standby parameter compatibility](https://www.postgresql.org/docs/18/hot-standby.html)

This procedure is for physical replicas of the same PostgreSQL major version. Logical subscribers are independent PostgreSQL instances and do not use this physical recovery parameter constraint.

## Prepare the connection budget

Suppose the cluster currently uses 500 connections and the reviewed target is 300. Confirm that application pools and administrative access fit the new capacity, accounting for reserved connection slots. Budget WAL sender connections separately under `max_wal_senders`; they do not consume `max_connections` slots. A recent low connection count is not enough; include expected peak demand and failover consolidation.

On every node, record effective values and configuration sources:

```sql
SELECT pg_is_in_recovery();

SELECT name, setting, context, source, sourcefile, pending_restart
FROM pg_settings
WHERE name IN (
    'max_connections',
    'superuser_reserved_connections',
    'reserved_connections',
    'max_wal_senders',
    'max_worker_processes',
    'max_prepared_transactions',
    'max_locks_per_transaction'
)
ORDER BY name;
```

Use an administrative role with visibility into configuration sources. `max_connections` takes effect at server startup, so a reload alone does not apply the reduction. [Connection settings](https://www.postgresql.org/docs/18/runtime-config-connection.html)

Reduce application pool limits before restarting the database. Include all application instances in the total, not just the limit for one process. Confirm that connection retries use backoff so the restart does not cause an immediate reconnect surge.

## Coordinate restart ownership

Identify the actual primary and all direct and cascading standbys. Confirm each standby is healthy and replaying. Record the previous configuration so it can be restored.

If a database operator, HA manager, or managed service owns the configuration, make the change through that system. Prevent an automatic rolling-restart policy from applying the lower setting to standbys first. Follow the platform's documented maintenance procedure for preventing an unintended promotion while the primary restarts.

A primary restart interrupts active connections. Schedule that interruption and drain traffic as required. A switchover-based plan must track which node becomes the primary at every step; role changes do not remove the parameter compatibility requirement.

## Lower and restart the primary

For a self-managed server whose configuration is intentionally managed with `ALTER SYSTEM`, run only on the primary:

```sql
ALTER SYSTEM SET max_connections = '300';
SELECT pg_reload_conf();
```

The reload lets you inspect `pending_restart`; it does not finish the change. Restart that primary with your service manager and verify:

```sql
SHOW max_connections;
SELECT pg_is_in_recovery();
```

Expect `300` and `false`. Stop the rollout if the node has changed role or the effective setting is wrong.

After successful restart, establish a WAL position beyond the configuration transition:

```sql
CHECKPOINT;
SELECT pg_current_wal_flush_lsn() AS restart_barrier;
```

Record the returned LSN. A checkpoint is used here as a deliberate operational boundary after the restart; account for its I/O cost in the maintenance plan. PostgreSQL provides separate functions for current flushed WAL and standby replay progress. [Administration functions](https://www.postgresql.org/docs/18/functions-admin.html)

## Wait for every standby to cross the boundary

On each standby, substitute the actual recorded LSN:

```sql
SELECT pg_is_in_recovery(),
       pg_last_wal_replay_lsn(),
       pg_last_wal_replay_lsn() >= '0/5000000'::pg_lsn AS crossed_barrier,
       pg_is_wal_replay_paused();
```

The example literal is a placeholder, not a universal threshold. Require recovery mode, `crossed_barrier = true`, and unpaused replay on each node. Check cascading descendants too. If a standby is behind or disconnected, retain its old higher capacity and repair replication before reducing it.

This wait matters because configuration compatibility is represented in WAL. An updated primary setting in a monitoring dashboard does not prove that a delayed standby has replayed past the older requirement.

## Restart standbys one at a time

Set each standby's managed configuration to 300, restart it, and verify its effective setting, recovery role, and resumed replay before proceeding to the next node. Keep sufficient healthy replicas available for the cluster's availability requirements throughout the rollout.

After all nodes have converged, check connection rejection rates, pool wait time, replica lag, and the configured values on every failover candidate. Matching capacities make future promotions easier to reason about.

If a standby logs insufficient parameter settings and pauses recovery, restore that standby to a value high enough for the WAL it must replay and restart it. Merely calling `pg_wal_replay_resume()` does not allocate the missing shared memory and will cause the server to shut down when recovery is unpaused after this error. [Hot standby recovery behavior](https://www.postgresql.org/docs/18/hot-standby.html)

If the lower primary limit causes application problems, reversing the change is an increase: raise and restart every affected standby first, then raise and restart the primary. Treat rollback ordering with the same care as the original rollout.
