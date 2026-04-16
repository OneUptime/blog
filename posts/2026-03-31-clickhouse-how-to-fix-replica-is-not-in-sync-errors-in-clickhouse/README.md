# How to Fix 'Replica is not in sync' Errors in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Replication, High Availability, Troubleshooting, Distributed System

Description: Diagnose and fix ClickHouse 'Replica is not in sync' errors by inspecting replication queues, resolving merge conflicts, and recovering lagging replicas.

---

## Understanding the Error

When ClickHouse detects that a replica has diverged from its peers or its replication queue is stalled, it surfaces errors like:

```text
DB::Exception: Replica is not in sync with other replicas. (REPLICA_IS_NOT_IN_ACTIVE_STATE)
```

or during INSERT with `insert_quorum`:

```text
DB::Exception: Quorum for previous write has not been satisfied yet. (UNSATISFIED_QUORUM_FOR_PREVIOUS_WRITE)
```

This indicates that the replica has fallen behind in applying data parts from ZooKeeper/Keeper.

## Diagnosing the Problem

### Check Replication Status

```sql
-- Overview of all replicas
SELECT
    database,
    table,
    replica_name,
    is_leader,
    is_readonly,
    is_session_expired,
    future_parts,
    parts_to_check,
    queue_size,
    inserts_in_queue,
    merges_in_queue,
    log_max_index,
    log_pointer,
    absolute_delay
FROM system.replicas
ORDER BY absolute_delay DESC;
```

A high `absolute_delay` or large `queue_size` indicates a lagging replica.

### Inspect the Replication Queue

```sql
-- Find stuck or long-running replication tasks
SELECT
    database,
    table,
    type,
    create_time,
    required_quorum,
    source_replica,
    new_part_name,
    num_tries,
    last_exception,
    last_attempt_time
FROM system.replication_queue
WHERE last_exception != ''
ORDER BY num_tries DESC
LIMIT 20;
```

### Look for Log Gaps

```sql
-- Compare log_pointer to log_max_index to see how far behind
SELECT
    table,
    log_max_index - log_pointer AS lag_entries,
    absolute_delay AS lag_seconds
FROM system.replicas
WHERE database = 'analytics';
```

## Common Fixes

### Fix 1 - Resume Fetching Parts from Other Replicas

If the replica has stopped fetching:

```sql
-- Re-enable fetches on this replica
SYSTEM START FETCHES analytics.events;

-- Force the replica to sync
SYSTEM SYNC REPLICA analytics.events;
```

### Fix 2 - Drop and Re-Fetch a Specific Corrupt Part

```sql
-- Identify problematic parts
SELECT name, bytes_on_disk, modification_time, remove_time
FROM system.parts
WHERE database = 'analytics' AND table = 'events' AND active = 0;

-- Drop a specific part and let replication re-fetch it
ALTER TABLE analytics.events DROP DETACHED PART '20240101_1_1_0';

-- Trigger consistency check
SYSTEM RESTART REPLICA analytics.events;
```

### Fix 3 - Clear the Replication Queue for Bad Entries

If a replication task is permanently failing:

```sql
-- Check what's blocking the queue
SELECT * FROM system.replication_queue
WHERE table = 'events' AND last_exception != ''
LIMIT 5;

-- Remove a dead/stale replica's metadata from ZooKeeper (use with caution)
SYSTEM DROP REPLICA 'stale-replica-name' FROM TABLE analytics.events;
```

### Fix 4 - Full Replica Recovery

For a severely lagging or corrupted replica, restore from another:

```bash
# Stop ClickHouse on the lagging node
systemctl stop clickhouse-server

# Remove the table data directory
rm -rf /var/lib/clickhouse/data/analytics/events/
```

From another healthy replica, remove the lagging replica's metadata from ZooKeeper/Keeper:

```sql
SYSTEM DROP REPLICA 'lagging-node' FROM TABLE analytics.events;
```

Then restart ClickHouse on the previously lagging node so it re-initializes and fetches parts from healthy replicas:

```bash
systemctl start clickhouse-server
```

Then wait for the replica to sync:

```sql
-- Monitor sync progress
SYSTEM SYNC REPLICA analytics.events STRICT;
```

## Prevention

```sql
-- Set a conservative insert quorum to ensure durability
SET insert_quorum = 2;
SET insert_quorum_timeout = 60000;

-- Monitor replication lag continuously
SELECT table, absolute_delay
FROM system.replicas
WHERE absolute_delay > 60;
```

## Summary

"Replica is not in sync" errors indicate that a ClickHouse replica has fallen behind in applying replicated parts. Start diagnosis with `system.replicas` and `system.replication_queue` to find the lag magnitude and stuck tasks. Light fixes include `SYSTEM SYNC REPLICA` and `SYSTEM START FETCHES`; severe divergence requires wiping the replica's data directory and letting it re-sync from healthy peers via ZooKeeper/Keeper.
