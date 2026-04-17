# How to Use Distributed Table Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Distributed Engine, Cluster, Sharding, Storage Engine

Description: Learn how to use the Distributed table engine in ClickHouse to query and write across multiple shards in a cluster, enabling horizontal scaling for large datasets.

---

The `Distributed` engine does not store data itself. Instead it acts as a transparent proxy over local tables on each shard in a ClickHouse cluster. When you query a Distributed table, ClickHouse sends sub-queries to each shard in parallel, merges the results, and returns them to the client. When you insert into a Distributed table, rows are routed to shards according to a sharding key or distributed randomly. This is the primary mechanism for horizontal scaling in ClickHouse.

## Cluster Configuration

Before creating a Distributed table, define the cluster in `config.xml` or a `config.d` override.

```xml
<!-- /etc/clickhouse-server/config.d/clusters.xml -->
<clickhouse>
  <remote_servers>
    <analytics_cluster>
      <shard>
        <replica>
          <host>ch-node-01</host>
          <port>9000</port>
        </replica>
        <replica>
          <host>ch-node-02</host>
          <port>9000</port>
        </replica>
      </shard>
      <shard>
        <replica>
          <host>ch-node-03</host>
          <port>9000</port>
        </replica>
        <replica>
          <host>ch-node-04</host>
          <port>9000</port>
        </replica>
      </shard>
    </analytics_cluster>
  </remote_servers>
</clickhouse>
```

## Creating the Local Table on Each Shard

Each shard must have a local table with the same schema. Run this on every node.

```sql
-- Run on every shard node
CREATE TABLE events_local
(
    event_time  DateTime,
    user_id     UInt64,
    event_type  LowCardinality(String),
    page        String,
    duration_ms UInt32,
    country     LowCardinality(String)
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_time, user_id);
```

## Creating the Distributed Table

The Distributed table is typically created on all nodes (or on a dedicated query node).

```sql
-- Syntax: Distributed(cluster, database, local_table, [sharding_key])
CREATE TABLE events_distributed
(
    event_time  DateTime,
    user_id     UInt64,
    event_type  LowCardinality(String),
    page        String,
    duration_ms UInt32,
    country     LowCardinality(String)
)
ENGINE = Distributed(
    analytics_cluster,  -- cluster name from config
    default,            -- database on each shard
    events_local,       -- local table name on each shard
    rand()              -- sharding key (rand() = uniform random distribution)
);
```

## Sharding by a Business Key

Using a deterministic sharding key ensures related rows land on the same shard, improving co-located JOINs.

```sql
CREATE TABLE events_distributed
(
    event_time  DateTime,
    user_id     UInt64,
    event_type  LowCardinality(String),
    page        String,
    duration_ms UInt32,
    country     LowCardinality(String)
)
ENGINE = Distributed(
    analytics_cluster,
    default,
    events_local,
    cityHash64(user_id)  -- same user_id always routes to the same shard
);
```

## Inserting Data

Insert into the Distributed table. ClickHouse buffers rows by shard and sends them asynchronously.

```sql
INSERT INTO events_distributed VALUES
    (now(), 1001, 'page_view', '/home',    320, 'US'),
    (now(), 1002, 'click',     '/pricing',   0, 'DE'),
    (now(), 1003, 'page_view', '/docs',    180, 'US'),
    (now(), 1004, 'sign_up',   '/register',  0, 'JP');
```

## Reading Data Across All Shards

Queries on the Distributed table are automatically parallelized across shards.

```sql
SELECT
    toDate(event_time)   AS event_date,
    event_type,
    count()              AS event_count,
    uniq(user_id)        AS unique_users,
    avg(duration_ms)     AS avg_duration_ms
FROM events_distributed
WHERE event_time >= now() - INTERVAL 7 DAY
GROUP BY event_date, event_type
ORDER BY event_date DESC, event_count DESC;
```

## Distributed JOIN

When joining two Distributed tables with the same sharding key, ClickHouse can perform a local JOIN on each shard without cross-shard data movement.

```sql
-- Both tables sharded by user_id
SELECT
    e.user_id,
    u.username,
    count()          AS page_views,
    avg(e.duration_ms) AS avg_duration
FROM events_distributed      AS e
JOIN users_distributed        AS u ON e.user_id = u.user_id
WHERE e.event_type = 'page_view'
  AND e.event_time >= today()
GROUP BY e.user_id, u.username
ORDER BY page_views DESC
LIMIT 20;
```

## Checking Per-Shard Row Distribution

```sql
-- Count rows on each shard to verify sharding balance
SELECT
    _shard_num,
    count() AS shard_rows
FROM events_distributed
GROUP BY _shard_num
ORDER BY _shard_num;
```

```text
_shard_num  shard_rows
1           248531
2           251469
```

## Writing Directly to Local Tables

For maximum insert throughput, bypass the Distributed table and write directly to each shard's local table. The application must route rows to the correct shard.

```sql
-- On shard 1 (ch-node-01): insert only rows belonging to shard 1
INSERT INTO events_local
SELECT *
FROM input_batch
WHERE cityHash64(user_id) % 2 = 0;

-- On shard 2 (ch-node-03): insert rows for shard 2
INSERT INTO events_local
SELECT *
FROM input_batch
WHERE cityHash64(user_id) % 2 = 1;
```

## Global IN for Cross-Shard Subqueries

By default, `IN (SELECT ...)` runs the subquery on each shard independently. Use `GLOBAL IN` to run the subquery once on the initiator and broadcast the result.

```sql
-- GLOBAL IN: subquery runs once, result is broadcast to all shards
SELECT
    user_id,
    count() AS event_count
FROM events_distributed
WHERE user_id GLOBAL IN (
    SELECT user_id FROM vip_users_distributed WHERE tier = 'gold'
)
GROUP BY user_id
ORDER BY event_count DESC
LIMIT 10;
```

## Monitoring the Distributed Table

```sql
-- Check pending data files waiting to be flushed to shards
SELECT
    database,
    table,
    data_files,
    data_compressed_bytes,
    error_count,
    last_exception
FROM system.distribution_queue
WHERE database = 'default'
  AND table = 'events_distributed';
```

## Summary

The `Distributed` engine is the gateway to horizontal scaling in ClickHouse. It proxies reads and writes across all shards in a named cluster. Choose a sharding key that distributes data evenly and co-locates frequently joined rows. Use `GLOBAL IN` and `GLOBAL JOIN` for cross-shard subqueries that must run correctly regardless of data placement. For maximum insert throughput, write directly to local shard tables and let replication handle durability.
