# How to Rebalance Data Across ClickHouse Shards

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Shard, Rebalancing, Cluster, Data Migration

Description: Learn practical strategies to rebalance data across ClickHouse shards after adding new nodes or when shards become uneven in size.

---

ClickHouse does not automatically rebalance data when you add new shards. Historical data stays on the original shards while only new inserts go to the new shard. This guide covers strategies for moving data to achieve a more even distribution.

## Assess Current Shard Balance

Before rebalancing, measure the size discrepancy across shards:

```sql
SELECT
    hostName() AS host,
    sum(rows) AS total_rows,
    formatReadableSize(sum(bytes_on_disk)) AS disk_size,
    count() AS part_count
FROM clusterAllReplicas('my_cluster', system, parts)
WHERE active
  AND database = 'default'
  AND table = 'events_local'
GROUP BY host
ORDER BY total_rows DESC;
```

## Strategy 1 - INSERT SELECT from Old Shards

The simplest approach is to select data from overloaded shards and insert it through the Distributed table, which routes it to all shards including the new one.

```sql
-- Insert a subset of data from one shard into the distributed table
INSERT INTO events
SELECT *
FROM remote('ch-node-01', default, events_local)
WHERE toYYYYMM(event_time) = 202401;
```

After verifying the data exists on multiple shards, delete the original partition from the source shard only (run this directly on the source node, not with `ON CLUSTER`):

```sql
ALTER TABLE events_local
DROP PARTITION '202401';
```

Proceed partition by partition to keep the operation manageable.

## Strategy 2 - Clickhouse-copier Tool

For large-scale rebalancing, use the `clickhouse-copier` utility. It reads from one cluster and writes to another (or the same cluster with a different sharding key).

Create a task configuration file `copier_task.xml`:

```xml
<clickhouse>
    <tables>
        <table_events>
            <cluster_pull>my_cluster</cluster_pull>
            <database_pull>default</database_pull>
            <table_pull>events_local</table_pull>
            <cluster_push>my_cluster</cluster_push>
            <database_push>default</database_push>
            <table_push>events_local_new</table_push>
            <sharding_key>cityHash64(user_id)</sharding_key>
        </table_events>
    </tables>
</clickhouse>
```

Run the copier:

```bash
clickhouse-copier \
    --config /etc/clickhouse-server/config.xml \
    --task-path /clickhouse/copier/task1 \
    --base-dir /tmp/copier
```

## Strategy 3 - Remap Sharding Key

If your current sharding key causes hotspots, change it to distribute writes more evenly going forward:

```sql
-- Old distributed table with poor sharding key
DROP TABLE IF EXISTS events;

-- New distributed table with better sharding key
CREATE TABLE events
AS events_local
ENGINE = Distributed(my_cluster, default, events_local, cityHash64(user_id));
```

New inserts will be distributed more evenly, gradually balancing the cluster as old data ages out.

## Monitor Rebalancing Progress

Track balance as you move data:

```sql
SELECT
    hostName() AS host,
    min(partition) AS min_partition,
    max(partition) AS max_partition,
    formatReadableSize(sum(bytes_on_disk)) AS size
FROM clusterAllReplicas('my_cluster', system, parts)
WHERE active AND table = 'events_local'
GROUP BY host;
```

## Summary

Rebalancing ClickHouse shards requires manual effort since the engine does not redistribute data automatically. Use partition-level INSERT-SELECT for targeted moves, clickhouse-copier for large migrations, or update the sharding key to fix future distribution. Always remove source data only after confirming copies exist on the destination shards.
