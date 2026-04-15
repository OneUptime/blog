# How to Use ReplicatedReplacingMergeTree Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ReplicatedReplacingMergeTree, Replication, Deduplication, MergeTree

Description: Learn how to use ReplicatedReplacingMergeTree to replicate tables across ClickHouse nodes while automatically deduplicating rows by a version column.

---

ReplicatedReplacingMergeTree combines two features: cross-node replication (from ReplicatedMergeTree) and row-level deduplication by a version column (from ReplacingMergeTree). It is the right choice when you need a replicated table that stores only the latest version of each row identified by its sorting key (the `ORDER BY` columns).

## When to Use It

Use ReplicatedReplacingMergeTree when:
- You have mutable entities (user profiles, order statuses) that get updated frequently
- You need high availability through replication
- You want automatic deduplication so only the latest version of each row survives merges

## Creating the Table

```sql
CREATE TABLE user_profiles ON CLUSTER my_cluster (
    user_id UInt64,
    name String,
    email String,
    plan String,
    updated_at DateTime
)
ENGINE = ReplicatedReplacingMergeTree(
    '/clickhouse/tables/{shard}/user_profiles',
    '{replica}',
    updated_at
)
ORDER BY user_id;
```

The third argument (`updated_at`) is the version column. During merges, ClickHouse keeps the row with the highest version value for each `ORDER BY` key.

## Inserting and Updating

ClickHouse is append-only - updates are expressed as new rows:

```sql
-- Initial insert
INSERT INTO user_profiles VALUES
(1, 'Alice', 'alice@example.com', 'free', '2024-01-01 10:00:00');

-- "Update": insert a new row with a higher updated_at
INSERT INTO user_profiles VALUES
(1, 'Alice', 'alice@work.com', 'pro', '2024-06-15 09:30:00');
```

After a merge, only the row with `updated_at = '2024-06-15 09:30:00'` will remain.

## Querying the Latest Version

Before a merge occurs, duplicates may coexist. Use the FINAL modifier to get deduplicated results:

```sql
SELECT *
FROM user_profiles FINAL
WHERE user_id = 1;
```

Or use `argMax` for better performance on large tables:

```sql
SELECT
    user_id,
    argMax(name, updated_at) AS name,
    argMax(email, updated_at) AS email,
    argMax(plan, updated_at) AS plan
FROM user_profiles
GROUP BY user_id;
```

## Forcing Deduplication

You can trigger an immediate merge and deduplication on a partition:

```sql
OPTIMIZE TABLE user_profiles ON CLUSTER my_cluster FINAL;
```

Avoid doing this in production on large tables - let background merges handle it naturally.

## Verifying Replication

Check that both replicas are in sync:

```sql
SELECT
    replica_name,
    is_leader,
    total_replicas,
    active_replicas,
    queue_size,
    absolute_delay
FROM system.replicas
WHERE table = 'user_profiles';
```

## Comparison with ReplicatedMergeTree

| Feature | ReplicatedMergeTree | ReplicatedReplacingMergeTree |
|---|---|---|
| Replication | Yes | Yes |
| Row deduplication | No | Yes, by version |
| Use case | Immutable events | Mutable entities |

## Summary

ReplicatedReplacingMergeTree is the best engine for distributed ClickHouse deployments that store mutable entities. It ensures your data is replicated across nodes for fault tolerance and automatically deduplicates rows during merges, keeping only the latest version. Use the FINAL keyword or argMax pattern when querying to ensure you always get up-to-date, deduplicated results.
