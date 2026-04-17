# Common ClickHouse Replication Mistakes and How to Fix Them

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Replication, ReplicatedMergeTree, ZooKeeper, High Availability

Description: Avoid the most common ClickHouse replication mistakes that cause data loss, split-brain, and replication lag in production clusters.

---

ClickHouse replication is powerful but easy to misconfigure. These mistakes are seen repeatedly in production clusters and each one can cause silent data loss or hours of downtime.

## Mistake 1: Using MergeTree Instead of ReplicatedMergeTree

The most basic mistake is forgetting to use a replicated engine. Data inserted into a plain `MergeTree` table on one node will never reach other nodes.

```sql
-- Wrong: no replication
CREATE TABLE events (id UInt64, ts DateTime) ENGINE = MergeTree() ORDER BY id;

-- Correct: replication via ZooKeeper path
CREATE TABLE events (id UInt64, ts DateTime)
ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/events', '{replica}')
ORDER BY id;
```

Use macros in `config.xml` to set `{shard}` and `{replica}` per node so ZooKeeper paths are consistent.

## Mistake 2: Identical ZooKeeper Paths on Different Shards

If two shards accidentally share the same ZooKeeper path, they become part of the same replication group. Inserts meant for shard 1 will replicate to shard 2 and vice versa, causing data duplication.

```xml
<!-- node-1 config.xml -->
<macros>
  <shard>01</shard>
  <replica>replica-01</replica>
</macros>

<!-- node-2 config.xml -->
<macros>
  <shard>02</shard>
  <replica>replica-01</replica>
</macros>
```

Each shard must have a unique path. Use `{shard}` in the ZooKeeper path template.

## Mistake 3: Not Monitoring the Replication Queue

Replication lag builds silently. The replication queue can grow to thousands of entries while queries return stale data.

```sql
SELECT database, table, node_name, num_tries, last_exception
FROM system.replication_queue
WHERE last_exception != ''
ORDER BY last_attempt_time DESC
LIMIT 20;
```

Set up alerts on `system.replication_queue` where `num_tries > 5` or `last_exception != ''`.

## Mistake 4: Overloading ZooKeeper with Too Many Tables

Each replicated table creates multiple ZooKeeper nodes per replica. With hundreds of small tables, ZooKeeper becomes a bottleneck. Prefer ClickHouse Keeper (built-in) and merge small tables into fewer large ones.

## Mistake 5: Ignoring insert_quorum

By default, `INSERT` returns success after writing to a single replica. If that node fails before replication completes, data is lost.

```sql
SET insert_quorum = 2;
SET insert_quorum_timeout = 60000;
INSERT INTO events VALUES (1, now());
```

With `insert_quorum = 2`, ClickHouse waits until at least two replicas confirm the write.

## Mistake 6: Not Restoring a Replica After Keeper Metadata Loss

If a replica's state is lost from ZooKeeper/Keeper (for example, after a Keeper data loss incident), the table enters readonly mode and stops replicating even though local parts are still on disk. Simply recreating the table will not recover it — you need to explicitly restore the replica so it re-registers its local parts in Keeper and refetches anything missing from peers.

```bash
clickhouse-client --query \
  "SYSTEM RESTORE REPLICA events ON CLUSTER my_cluster"
```

For targeted recovery of specific partitions from another replica, use `ALTER TABLE events FETCH PARTITION <partition_id> FROM '/clickhouse/tables/01/events'` and then `ATTACH PARTITION`. Note that creating a brand-new replica against an existing ZooKeeper path does not need this step — ClickHouse fetches data automatically once the table is created.

## Summary

ClickHouse replication mistakes range from missing replicated engines to ZooKeeper misconfiguration and silent queue backlogs. Use `ReplicatedMergeTree` with unique per-shard ZooKeeper paths, set `insert_quorum` for durability, and monitor `system.replication_queue` continuously to catch issues before they become outages.
