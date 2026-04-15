# How to Recover a Failed ClickHouse Replica

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Replication, Recovery, Database, Operation

Description: Step-by-step guide to recovering a failed ClickHouse replica, whether it fell behind due to downtime, disk failure, or data corruption.

When a ClickHouse replica goes down, the other replicas in the same shard continue serving reads and writes. When the failed replica comes back up, ClickHouse automatically detects the lag and starts fetching missing parts from the healthy replica. In most cases you do not need to do anything. But when auto-recovery fails - due to a very long outage, disk corruption, or a ZooKeeper metadata mismatch - you need to intervene manually.

## Step 1: Assess the Situation

Before taking any action, understand what happened:

```sql
-- Check the current state of all replicas
SELECT
    database,
    table,
    is_leader,
    is_readonly,
    absolute_delay,
    queue_size,
    inserts_in_queue,
    merges_in_queue,
    last_queue_update_exception,
    zookeeper_path,
    replica_name,
    replica_path
FROM system.replicas
ORDER BY absolute_delay DESC;
```

```sql
-- Check for tasks that are consistently failing
SELECT
    database,
    table,
    type,
    new_part_name,
    num_tries,
    last_exception,
    last_attempt_time
FROM system.replication_queue
WHERE num_tries > 3
ORDER BY last_attempt_time DESC;
```

If `absolute_delay` is growing and `last_queue_update_exception` shows a repeating error, the replica is not recovering on its own.

## Step 2: Restart the Replication Thread

The first and safest recovery action. This reinitializes the replication thread for a specific table without touching data:

```sql
-- Restart replication for one table
SYSTEM RESTART REPLICA database_name.table_name;

-- Restart all replicated tables at once
SYSTEM RESTART REPLICAS;
```

Wait a few minutes and check if `absolute_delay` is decreasing and the queue is shrinking.

## Step 3: Sync Data from Healthy Replica

If the replica has valid data but needs to fill gaps, force it to sync from the other replica:

```sql
-- Wait until the replica processes current replication queue entries
SYSTEM SYNC REPLICA database_name.table_name;

-- Wait until the replication queue is completely empty
SYSTEM SYNC REPLICA database_name.table_name STRICT;
```

The base command waits for the replica to process entries from the replication log, up to `receive_timeout` seconds (default 300 seconds). `STRICT` mode goes further: it waits until the replication queue is completely empty. Note that `STRICT` may never return if new entries keep appearing in the queue.

## Step 4: Restore ZooKeeper Metadata from Local Data

When ZooKeeper metadata for a replica is lost but the local data is still intact, use `SYSTEM RESTORE REPLICA`:

```sql
-- Rebuilds ZooKeeper metadata from locally present data parts
-- The table must be in read-only mode for this to work
SYSTEM RESTORE REPLICA database_name.table_name;
```

This command works only on read-only `ReplicatedMergeTree` tables. It scans locally present data parts and re-registers them in ZooKeeper, avoiding the need to re-download all data over the network. Parts that existed before the metadata loss are reattached rather than re-fetched from other replicas.

## Step 5: Drop and Recreate the Replica (Nuclear Option)

If the local data is corrupted beyond repair, drop the replica's ZooKeeper registration and let it re-initialize from scratch. This causes a full re-sync, which means downloading all data from the other replica:

```sql
-- On the FAILED replica only
-- Step 1: Detach the table (makes it inaccessible but preserves data on disk)
DETACH TABLE database_name.table_name;

-- Step 2: Delete local ZooKeeper replica node (run on a ZooKeeper client or ClickHouse Keeper client)
-- The replica path is in system.replicas.replica_path
-- Example: /clickhouse/tables/01/events/replicas/ch2.internal
```

```bash
# Using the ZooKeeper CLI
zkCli.sh -server zk1.internal:2181
deleteall /clickhouse/tables/01/events/replicas/ch2.internal
```

```sql
-- Step 3: Reattach the table
-- ClickHouse will see no ZooKeeper registration and create a new one,
-- then download all data from the healthy replica
ATTACH TABLE database_name.table_name;
```

You can verify the re-sync progress:

```sql
SELECT
    table,
    queue_size,
    absolute_delay
FROM system.replicas
WHERE table = 'table_name';
```

## Step 6: Recovering from Disk Failure (Full Data Loss)

If the disk died and you lost all local data for the ClickHouse node, the recovery process is:

```bash
# 1. Replace the disk and remount at the same path
# 2. Reinstall ClickHouse if needed
# 3. Restore config files from backup (config.d/, users.d/)
# 4. Start ClickHouse
systemctl start clickhouse-server

# 5. ClickHouse detects the ZooKeeper registration for this replica
#    and finds the local data directory empty.
#    It enters recovery mode automatically and downloads all parts.
```

Check progress in the logs:

```bash
journalctl -u clickhouse-server -f | grep -i "fetch\|replica\|recover"
```

Or in the system table:

```sql
-- Watch recovery progress
SELECT
    table,
    queue_size,
    absolute_delay,
    inserts_in_queue
FROM system.replicas
WHERE is_readonly = 0
ORDER BY queue_size DESC;
```

## Step 7: Handling "Replica is Lost" State

In rare cases, ClickHouse marks a replica as "lost" in ZooKeeper. This happens when the replica was offline while parts were being cleaned up from all other replicas (the data no longer exists anywhere to fetch from). Check for this state:

```sql
-- A lost replica shows up as read-only with this specific error
SELECT
    database,
    table,
    is_readonly,
    last_queue_update_exception
FROM system.replicas
WHERE last_queue_update_exception LIKE '%lost%';
```

If a replica is truly lost and the missing data cannot be recovered, you have two options:

1. Accept the data loss and mark the replica as fresh (re-sync from the healthy replica which has the post-loss data)
2. Restore from a backup

To accept the loss and re-sync:

```sql
-- Run this on a HEALTHY replica, not on the failed one
-- This removes the dead replica's metadata from ZooKeeper
-- Data that was lost before the recovery cannot be restored this way

SYSTEM DROP REPLICA 'ch2.internal' FROM TABLE database_name.table_name;
```

Then recreate the table on the recovered node with the same `CREATE TABLE` statement. ClickHouse will register a new replica in ZooKeeper and start syncing from the current state of the healthy replica.

## Verification Checklist

After any recovery operation, verify these conditions before considering the replica healthy:

```sql
-- All checks should pass
SELECT
    database,
    table,
    is_readonly = 0        AS not_readonly,
    absolute_delay < 10    AS lag_acceptable,
    queue_size < 100       AS queue_manageable,
    last_queue_update_exception = '' AS no_errors
FROM system.replicas
WHERE table = 'your_table';

-- Part counts should match between replicas
SELECT
    _shard_num,
    count() AS row_count
FROM clusterAllReplicas('production_cluster', database_name.table_name)
GROUP BY _shard_num;
```

If part counts differ significantly, the replica may still be catching up. Wait and re-check, or investigate the replication queue for stuck tasks.
