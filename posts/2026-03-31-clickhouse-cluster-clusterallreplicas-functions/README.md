# How to Use cluster() and clusterAllReplicas() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, cluster(), clusterAllReplicas(), Table Function, Distributed, SQL, Cluster

Description: Learn how to use cluster() and clusterAllReplicas() table functions to query all shards and replicas in a ClickHouse cluster directly from SQL.

---

`cluster(cluster_name, db, table)` and `clusterAllReplicas(cluster_name, db, table)` are ClickHouse table functions that route queries across all shards or replicas in a named cluster defined in `remote_servers` configuration. They are the functional equivalents of `Distributed` table engine queries but without requiring a permanent `Distributed` table object.

## Cluster Configuration Prerequisite

Both functions rely on a cluster definition in `config.xml` or `remote_servers.xml`:

```text
<remote_servers>
    <analytics_cluster>
        <shard>
            <replica>
                <host>ch-node-1</host>
                <port>9000</port>
            </replica>
            <replica>
                <host>ch-node-2</host>
                <port>9000</port>
            </replica>
        </shard>
        <shard>
            <replica>
                <host>ch-node-3</host>
                <port>9000</port>
            </replica>
            <replica>
                <host>ch-node-4</host>
                <port>9000</port>
            </replica>
        </shard>
    </analytics_cluster>
</remote_servers>
```

## cluster() - Query One Replica per Shard

`cluster()` contacts one replica per shard (load-balanced or first available). Use it for normal distributed reads.

```sql
-- Count events across all shards
SELECT count()
FROM cluster('analytics_cluster', 'mydb', 'events');
```

```sql
-- Aggregate across all shards
SELECT
    event_type,
    count() AS cnt
FROM cluster('analytics_cluster', 'mydb', 'events')
WHERE toDate(event_time) = today()
GROUP BY event_type
ORDER BY cnt DESC;
```

## clusterAllReplicas() - Query All Replicas

`clusterAllReplicas()` contacts every replica on every shard. This is useful for:
- Reading data that exists only on specific replicas (not yet replicated).
- Verification: comparing row counts across all replicas.
- Debugging replication lag.

```sql
-- Count rows on every replica to detect lag
SELECT
    hostName() AS host,
    count()    AS row_count
FROM clusterAllReplicas('analytics_cluster', 'mydb', 'events')
GROUP BY host
ORDER BY host;
```

```text
host       row_count
ch-node-1  10000000
ch-node-2  9999980     -- small lag
ch-node-3  10000000
ch-node-4  10000000
```

## Using with a Subquery

```sql
-- Find top users across all shards
SELECT user_id, sum(event_cnt) AS total
FROM (
    SELECT user_id, count() AS event_cnt
    FROM cluster('analytics_cluster', 'mydb', 'events')
    WHERE event_time >= now() - INTERVAL 1 DAY
    GROUP BY user_id
)
GROUP BY user_id
ORDER BY total DESC
LIMIT 10;
```

## Combining with system Tables

```sql
-- Check part counts on every node
SELECT
    hostName() AS host,
    count()    AS part_count
FROM clusterAllReplicas('analytics_cluster', system, parts)
WHERE table = 'events'
  AND active = 1
GROUP BY host;
```

## Shorthand with db.table

Both functions also accept the `db.table` shorthand instead of separate database and table arguments:

```sql
SELECT *
FROM cluster('analytics_cluster', mydb.events)
LIMIT 10;
```

## Differences at a Glance

```text
Function               Contacts                  Use Case
cluster()              One replica per shard     Normal distributed queries
clusterAllReplicas()   All replicas everywhere   Replication verification, debugging
```

## Performance Tip

Both functions fan out to all shards and merge results. Ensure you always filter on the partition key or sorting key so the predicate is pushed down and less data is scanned at each shard:

```sql
-- Efficient: filters pushed to each shard
SELECT count()
FROM cluster('analytics_cluster', 'mydb', 'events')
WHERE toDate(event_time) = today();
```

## Summary

`cluster()` and `clusterAllReplicas()` give you ad hoc distributed query capability without permanent Distributed table objects. Use `cluster()` for production distributed reads (one replica per shard), and `clusterAllReplicas()` for replication health checks and replica-level debugging. Both require a named cluster in `remote_servers` configuration.
