# How to Use ReplicatedReplacingMergeTree in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ReplicatedReplacingMergeTree, Replication, Deduplication, Storage Engine

Description: Learn how to use ReplicatedReplacingMergeTree in ClickHouse to deduplicate rows by primary key across replicated nodes, keeping only the latest version of each record.

---

`ReplicatedReplacingMergeTree` combines `ReplacingMergeTree` semantics with ClickHouse replication. It deduplicates rows that share the same `ORDER BY` key during background merges, keeping only the row with the highest version value (or the last inserted row when no version column is specified). Replication ensures that inserts and merges are synchronized across all replicas via ZooKeeper or ClickHouse Keeper. Use it for mutable datasets - like user profiles, order statuses, or product inventories - that need high availability.

## Prerequisites: Macros Configuration

```xml
<!-- /etc/clickhouse-server/config.d/macros.xml -->
<clickhouse>
  <macros>
    <shard>01</shard>
    <replica>replica-01</replica>
  </macros>
</clickhouse>
```

## Creating a ReplicatedReplacingMergeTree Table

```sql
-- Run on each replica
CREATE TABLE user_profiles
(
    user_id     UInt64,
    username    String,
    email       String,
    plan        LowCardinality(String),
    country     LowCardinality(String),
    updated_at  DateTime,
    version     UInt64          -- used as the version column for replacement
)
ENGINE = ReplicatedReplacingMergeTree(
    '/clickhouse/tables/{shard}/user_profiles',
    '{replica}',
    version             -- rows with higher version win during merge
)
PARTITION BY toYYYYMM(updated_at)
ORDER BY user_id;       -- ORDER BY key determines which rows deduplicate together
```

## Inserting Initial Data

```sql
INSERT INTO user_profiles VALUES
    (1001, 'alice', 'alice@example.com', 'free',    'US', '2024-06-01 10:00:00', 1),
    (1002, 'bob',   'bob@example.com',   'pro',     'DE', '2024-06-01 10:00:00', 1),
    (1003, 'carol', 'carol@example.com', 'premium', 'JP', '2024-06-01 10:00:00', 1);
```

## Upserting an Updated Row

Insert a new row with the same `ORDER BY` key and a higher version to replace the old one.

```sql
-- Alice upgraded her plan and changed her email
INSERT INTO user_profiles VALUES
    (1001, 'alice', 'alice_new@example.com', 'premium', 'US', '2024-06-15 09:00:00', 2);
```

Both rows exist until a background merge occurs. During the merge, the row with `version = 2` replaces `version = 1`.

## Reading With FINAL to See Deduplicated Data

Use `FINAL` to force deduplication at query time, even before background merges run.

```sql
SELECT
    user_id,
    username,
    email,
    plan,
    updated_at,
    version
FROM user_profiles FINAL
ORDER BY user_id;
```

```text
user_id  username  email                  plan     updated_at            version
1001     alice     alice_new@example.com  premium  2024-06-15 09:00:00   2
1002     bob       bob@example.com        pro      2024-06-01 10:00:00   1
1003     carol     carol@example.com      premium  2024-06-01 10:00:00   1
```

## Bulk Update Pattern

```sql
-- Simulate a batch update of subscription statuses
INSERT INTO user_profiles
SELECT
    user_id,
    username,
    email,
    new_plan          AS plan,
    country,
    now()             AS updated_at,
    version + 1       AS version
FROM (
    SELECT
        p.user_id,
        p.username,
        p.email,
        s.new_plan,
        p.country,
        p.version
    FROM user_profiles FINAL AS p
    JOIN plan_upgrades AS s ON p.user_id = s.user_id
    WHERE s.effective_date = today()
);
```

## Without a Version Column

If no version column is provided, ClickHouse keeps the last physically inserted row among duplicates.

```sql
CREATE TABLE order_statuses
(
    order_id   UInt64,
    status     LowCardinality(String),
    updated_at DateTime
)
ENGINE = ReplicatedReplacingMergeTree(
    '/clickhouse/tables/{shard}/order_statuses',
    '{replica}'
    -- no version column: last insert wins
)
ORDER BY order_id;

INSERT INTO order_statuses VALUES (5001, 'pending',   '2024-06-15 10:00:00');
INSERT INTO order_statuses VALUES (5001, 'shipped',   '2024-06-15 10:30:00');
INSERT INTO order_statuses VALUES (5001, 'delivered', '2024-06-15 18:00:00');

-- After merge, only the last insert per order_id remains
SELECT * FROM order_statuses FINAL WHERE order_id = 5001;
```

```text
order_id  status     updated_at
5001      delivered  2024-06-15 18:00:00
```

## Checking Replication Health

```sql
SELECT
    replica_name,
    is_leader,
    absolute_delay AS lag_seconds,
    queue_size,
    parts_to_check
FROM system.replicas
WHERE table = 'user_profiles';
```

```text
replica_name  is_leader  lag_seconds  queue_size  parts_to_check
replica-01    1          0            0           0
replica-02    0          0            0           0
```

## Forcing a Merge to Deduplicate

```sql
-- Deduplicate all parts in the June 2024 partition
OPTIMIZE TABLE user_profiles PARTITION '202406' FINAL;
```

After this, duplicate rows within the partition are gone and `FINAL` in queries becomes a no-op for that partition.

## Counting Actual Unique Users

Without `FINAL`, a count may include duplicates. Always use `FINAL` or a deduplication-aware query.

```sql
-- Correct: deduplicated count
SELECT count() FROM user_profiles FINAL;

-- Wrong (may double-count before merge):
SELECT count() FROM user_profiles;
```

## Pairing With a Distributed Table

```sql
CREATE TABLE user_profiles_dist
AS user_profiles
ENGINE = Distributed(
    analytics_cluster,
    default,
    user_profiles,
    user_id
);

-- Cross-shard deduplicated query
SELECT count() FROM user_profiles_dist FINAL;
```

## Limitations

- `FINAL` has a performance cost - it deduplicates at read time before merges happen.
- Deduplication is eventual: duplicate rows exist briefly until a background merge runs.
- Requires ZooKeeper/ClickHouse Keeper.
- `ORDER BY` key cannot be changed after table creation.

## Summary

`ReplicatedReplacingMergeTree` is the replicated version of `ReplacingMergeTree`. It deduplicates rows by `ORDER BY` key (keeping the highest version) during background merges, and replicates all data and merge operations for high availability. Use `FINAL` in queries for immediately consistent reads, and `OPTIMIZE ... FINAL` to eagerly deduplicate a partition.
