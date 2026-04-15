# How to Use DETACH and ATTACH Partitions in ClickHouse Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Replication, Partition, Database, Operation

Description: Learn how DETACH and ATTACH partition operations work in a replicated ClickHouse cluster, including safe workflows for moving, replacing, and restoring data.

`DETACH PARTITION` and `ATTACH PARTITION` are essential maintenance tools in ClickHouse. They let you move data between tables, restore from backups, replace corrupt data, and perform zero-downtime schema changes. In a replicated cluster, these operations interact with the replication system in ways you need to understand to avoid data loss or inconsistency.

## How Partition Operations Work in Replication

When you run `DETACH PARTITION` or `ATTACH PARTITION` on a replicated table, the operation is logged in ZooKeeper and replicated to all replicas in the shard. You only need to run the command on one replica - the other replicas will perform the same operation automatically.

This is different from non-replicated tables where you would need to run the command on each node individually.

## DETACH PARTITION

`DETACH PARTITION` moves all parts for a partition from the active data directory to the `detached` subdirectory. The data is not deleted - it is just hidden from queries:

```sql
-- Detach a specific partition (runs on all replicas via replication)
ALTER TABLE events DETACH PARTITION '202401';

-- Verify the partition is detached
SELECT
    partition_id,
    name,
    bytes_on_disk,
    disk,
    path
FROM system.detached_parts
WHERE table = 'events'
ORDER BY name;

-- The partition no longer shows in active parts
SELECT DISTINCT partition
FROM system.parts
WHERE table = 'events'
  AND active = 1;
```

After detaching, the data files sit in the `detached` directory on all replicas. They are not served to queries but are not deleted.

## ATTACH PARTITION

`ATTACH PARTITION` reads the parts in the `detached` directory and makes them active again:

```sql
-- Reattach a previously detached partition
ALTER TABLE events ATTACH PARTITION '202401';

-- Verify it is back
SELECT
    partition,
    count() AS part_count,
    sum(rows) AS total_rows
FROM system.parts
WHERE table = 'events'
  AND active = 1
GROUP BY partition
ORDER BY partition;
```

In a replicated setup, `ATTACH PARTITION` is replicated. The initiator replica attaches the parts from its own `detached` directory, and non-initiator replicas will either use matching parts from their own `detached` directory (if present with correct checksums) or download the data from a replica that has it. You do not need to manually place parts on every replica.

## Safe Workflow: Restoring a Partition on All Replicas

When you want to restore a partition from backup on a replicated table, place the files on one replica and attach from there. The other replicas will automatically download the data:

```bash
# Step 1: Copy the backup parts to the detached directory on one replica
# The detached directory is typically:
# /var/lib/clickhouse/data/{database}/{table}/detached/

rsync -av /backup/events_202401/ \
    /var/lib/clickhouse/data/mydb/events/detached/
```

```bash
# Step 2: Fix ownership
chown -R clickhouse:clickhouse \
    /var/lib/clickhouse/data/mydb/events/detached/
```

```sql
-- Step 3: Run ATTACH on the replica where you placed the files
-- The other replicas will download the data automatically via replication
ALTER TABLE mydb.events ATTACH PARTITION '202401';
```

## Copying a Partition Between Tables

`ATTACH PARTITION FROM` copies a partition from one table to another on the same server. In a replicated setup, run it on one node and it replicates:

```sql
-- Copy partition from source table to destination table
-- Both tables must have the same structure, partition key, primary key, and ORDER BY key
ALTER TABLE events_archive ATTACH PARTITION '202401'
FROM events;

-- Verify the partition was copied
SELECT
    table,
    partition,
    count() AS parts,
    sum(rows) AS total_rows
FROM system.parts
WHERE table IN ('events', 'events_archive')
  AND active = 1
  AND partition = '202401'
GROUP BY table, partition;
```

## REPLACE PARTITION

`REPLACE PARTITION` is an atomic swap of a partition between two tables. It is the safest way to reload a partition's data without a query gap:

```sql
-- Stage the new data in a staging table
CREATE TABLE events_staging AS events
ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/events_staging',
    '{replica}'
);

-- Load corrected data into staging
INSERT INTO events_staging
SELECT * FROM events_corrected
WHERE toYYYYMM(event_date) = 202401;

-- Atomically replace the partition in the production table
-- Queries hitting events will see either the old or new data, never a mix
ALTER TABLE events REPLACE PARTITION '202401'
FROM events_staging;

-- Clean up staging
DROP TABLE events_staging ON CLUSTER production_cluster;
```

## MOVE PARTITION

Move a partition to a different disk or volume (useful for tiered storage):

```sql
-- Move old partitions to slower storage
ALTER TABLE events MOVE PARTITION '202301' TO DISK 'cold_disk';

-- Move to a volume (group of disks)
ALTER TABLE events MOVE PARTITION '202301' TO VOLUME 'cold';

-- Check current disk assignment of partitions
SELECT
    partition,
    disk_name,
    path,
    formatReadableSize(bytes_on_disk) AS size
FROM system.parts
WHERE table = 'events'
  AND active = 1
ORDER BY partition;
```

In a replicated setup, `MOVE PARTITION` is NOT replicated, because different replicas can have different storage policies. You need to run the command on each replica individually if you want all replicas to move the partition.

## DROP PARTITION

Drop a partition permanently on all replicas with one command:

```sql
-- Drop a partition (replicated to all nodes)
ALTER TABLE events DROP PARTITION '202301';

-- Drop multiple partitions
ALTER TABLE events DROP PARTITION '202302';
ALTER TABLE events DROP PARTITION '202303';
```

## Handling Detached Parts After a Failed Replication

After a network partition or interrupted replication, you may find orphaned parts in the `detached` directory:

```sql
-- List all detached parts
SELECT
    database,
    table,
    partition_id,
    name,
    reason,
    bytes_on_disk,
    modification_time
FROM system.detached_parts
ORDER BY modification_time DESC;
```

The `reason` column tells you why the part was detached:

```text
broken          -- corrupted, failed checksum verification
unexpected      -- present locally but not registered in ZooKeeper
noquorum        -- insert did not achieve quorum, rolled back
```

Parts with `reason = 'broken'` should be deleted. Parts with `reason = 'unexpected'` may be from a previous failed insert - inspect them before deciding:

```bash
# Delete broken detached parts carefully after confirming
# the data is covered by a healthy active part
rm -rf /var/lib/clickhouse/data/mydb/events/detached/broken_*
```

```sql
-- Or use the SQL command to drop specific detached parts
ALTER TABLE events DROP DETACHED PART 'part_name_here'
SETTINGS allow_drop_detached = 1;
```

Always check `system.parts` first to confirm the data in the broken detached part is covered by a healthy active part before deleting.
