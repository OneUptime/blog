# How to Handle Replication Queue in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Replication, Queue, Database, Operation

Description: Learn how to read, diagnose, and manage the ClickHouse replication queue, including how to clear stuck tasks and prioritize queue entries.

The replication queue is the work list for a ClickHouse replica. It contains all the pending operations a replica needs to perform to catch up with the rest of its shard: fetching parts from other replicas, running merges, applying mutations, and updating metadata. When the queue grows or stalls, replication lag increases. This guide covers how to read the queue, identify problems, and take corrective action.

## Understanding the Replication Queue

Each `ReplicatedMergeTree` table has its own replication queue. The queue lives in ZooKeeper and is mirrored locally in `system.replication_queue`:

```sql
SELECT
    database,
    table,
    replica_name,
    position,
    node_name,
    type,
    create_time,
    required_quorum,
    source_replica,
    new_part_name,
    parts_to_merge,
    is_currently_executing,
    num_tries,
    last_exception,
    last_attempt_time,
    num_postponed,
    postpone_reason,
    last_postpone_time
FROM system.replication_queue
ORDER BY create_time ASC;
```

### Queue Entry Types

```text
GET_PART         -- fetch a part from another replica
MERGE_PARTS      -- merge multiple local parts into one
MUTATE_PART      -- apply a mutation (ALTER UPDATE/DELETE) to a part
DROP_RANGE       -- delete parts in a partition range (used by DROP PARTITION)
ATTACH_PART      -- attach a detached part
REPLACE_RANGE    -- drop a range of parts and replace with new ones
ALTER_METADATA   -- apply alter modification to metadata and columns
```

## Reading the Queue Effectively

Start with a summary view to understand the overall health:

```sql
-- Summary by table and type
SELECT
    database,
    table,
    type,
    countIf(is_currently_executing)  AS executing,
    countIf(NOT is_currently_executing AND num_tries = 0) AS waiting,
    countIf(NOT is_currently_executing AND num_tries > 0) AS retrying,
    max(num_tries)                   AS max_retries,
    count()                          AS total
FROM system.replication_queue
GROUP BY database, table, type
ORDER BY total DESC;
```

```sql
-- Find tasks that are stuck (many retries, not executing)
SELECT
    database,
    table,
    type,
    new_part_name,
    num_tries,
    last_exception,
    last_attempt_time,
    source_replica
FROM system.replication_queue
WHERE num_tries > 5
  AND NOT is_currently_executing
ORDER BY num_tries DESC
LIMIT 20;
```

## Common Queue Problems and Solutions

### Problem: GET_PART tasks failing with "No active replica has part"

This means the source replica no longer has the part. It may have been merged into a larger part:

```sql
-- Check replica status for the table
SELECT
    database,
    table,
    replica_name,
    total_replicas,
    active_replicas,
    queue_size,
    inserts_in_queue,
    merges_in_queue
FROM system.replicas
WHERE table = 'your_table';

-- Check parts on the local node
SELECT
    name,
    active,
    rows,
    bytes_on_disk
FROM system.parts
WHERE table = 'your_table'
ORDER BY name;
```

If the part has been merged on the source replica, the merge result should be in the queue and will be fetched instead. The old `GET_PART` entry will eventually be superseded. If it persists, restart the replica thread:

```sql
SYSTEM RESTART REPLICA database.table;
```

### Problem: MERGE_PARTS tasks failing with "Not enough disk space"

```sql
-- Check disk usage
SELECT
    name,
    path,
    formatReadableSize(free_space)  AS free,
    formatReadableSize(total_space) AS total,
    round(100 * free_space / total_space, 1) AS free_pct
FROM system.disks;
```

Free up space by dropping old partitions or moving data to cold storage, then the merge will retry automatically.

### Problem: MUTATE_PART tasks are slow or stuck

Mutations run part by part and can take a long time on large tables:

```sql
-- Check mutation progress
SELECT
    database,
    table,
    mutation_id,
    command,
    create_time,
    parts_to_do_names,
    parts_to_do,
    is_done,
    latest_failed_part,
    latest_fail_time,
    latest_fail_reason
FROM system.mutations
WHERE is_done = 0;
```

```sql
-- Kill a stuck mutation
KILL MUTATION
WHERE database = 'your_database'
  AND table = 'your_table'
  AND mutation_id = 'mutation_id_here';
```

## Controlling Queue Processing Speed

### Limit Concurrent Fetches

When a replica is catching up from a long outage, aggressive fetching can saturate network bandwidth and impact query performance:

```xml
<clickhouse>
    <merge_tree>
        <!-- Max network bandwidth for replicated fetches (bytes per second, 0 = unlimited) -->
        <max_replicated_fetches_network_bandwidth>104857600</max_replicated_fetches_network_bandwidth>
    </merge_tree>
</clickhouse>
```

Or limit the bandwidth at the table level:

```sql
ALTER TABLE database.table
    MODIFY SETTING max_replicated_fetches_network_bandwidth = 52428800;  -- 50 MB/s
```

### Pause and Resume Queue Processing

During a maintenance window, you may want to pause replication processing:

```sql
-- Stop replication processing for a table
SYSTEM STOP REPLICATION QUEUES database.table;

-- Stop for all tables
SYSTEM STOP REPLICATION QUEUES;

-- Resume
SYSTEM START REPLICATION QUEUES database.table;
SYSTEM START REPLICATION QUEUES;
```

This does not disconnect from ZooKeeper. The queue continues accumulating entries but ClickHouse does not process them until you resume.

### Stop and Start Fetches Only

```sql
-- Stop fetching parts (merges continue)
SYSTEM STOP FETCHES database.table;

-- Stop merges (fetches continue)
SYSTEM STOP MERGES database.table;

-- Resume
SYSTEM START FETCHES database.table;
SYSTEM START MERGES database.table;
```

## Clearing a Corrupted Queue

In rare cases, a queue entry becomes permanently corrupted and blocks everything behind it. The safest approach is to drop the replica's ZooKeeper state and re-sync:

```sql
-- First, identify the corrupted entry
SELECT
    node_name,
    new_part_name,
    last_exception
FROM system.replication_queue
WHERE last_exception != ''
LIMIT 1;
```

```bash
# Delete the specific queue entry from ZooKeeper
# The node_name from the query above is the ZooKeeper node name
zkCli.sh -server zk1.internal:2181
ls /clickhouse/tables/01/your_table/replicas/this-replica/queue
delete /clickhouse/tables/01/your_table/replicas/this-replica/queue/<node_name>
```

After deleting the ZooKeeper node, restart the replica thread:

```sql
SYSTEM RESTART REPLICA database.table;
```

## Monitoring Queue Depth with a Dashboard Query

Build a monitoring query that runs every minute and captures a snapshot:

```sql
SELECT
    now()                                 AS check_time,
    database,
    table,
    count()                               AS queue_depth,
    countIf(type = 'GET_PART')            AS pending_fetches,
    countIf(type = 'MERGE_PARTS')         AS pending_merges,
    countIf(type = 'MUTATE_PART')         AS pending_mutations,
    countIf(num_tries > 3)                AS stuck_tasks,
    max(now() - create_time)              AS oldest_entry_age_seconds
FROM system.replication_queue
GROUP BY database, table
ORDER BY queue_depth DESC;
```

A healthy replica should have a queue depth near 0 during normal operation, with occasional spikes during heavy ingest. A queue that stays high for more than a few minutes needs investigation.
