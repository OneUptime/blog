# How to Use ReplicatedSummingMergeTree Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ReplicatedSummingMergeTree, Replication, Aggregation, MergeTree

Description: Learn how to use ReplicatedSummingMergeTree to automatically sum numeric columns during merges across replicated ClickHouse nodes.

---

ReplicatedSummingMergeTree combines replication with automatic numeric column summation during background merges. It is designed for high-write aggregation scenarios like counters, metrics, and event tallies, where you need the data replicated across cluster nodes and pre-aggregated at storage level.

## How It Works

When ClickHouse performs a background merge, rows sharing the same primary key (ORDER BY key) have their numeric columns summed together. String and other non-numeric columns keep the value from one of the merged rows (arbitrary). Only columns that are NOT part of the ORDER BY key are summed.

## Creating the Table

```sql
CREATE TABLE page_views ON CLUSTER my_cluster (
    date Date,
    page_id UInt32,
    device String,
    views UInt64,
    unique_users UInt64,
    total_time_spent Float64
)
ENGINE = ReplicatedSummingMergeTree(
    '/clickhouse/tables/{shard}/page_views',
    '{replica}'
)
PARTITION BY toYYYYMM(date)
ORDER BY (date, page_id, device);
```

Columns `views`, `unique_users`, and `total_time_spent` will be summed during merges for rows with the same `(date, page_id, device)`.

## Explicitly Specifying Columns to Sum

You can optionally restrict which columns get summed:

```sql
ENGINE = ReplicatedSummingMergeTree(
    '/clickhouse/tables/{shard}/page_views',
    '{replica}',
    (views, total_time_spent)
)
```

`unique_users` will then retain an arbitrary value from one of the existing rows rather than being summed.

## Inserting Data

```sql
INSERT INTO page_views VALUES
('2024-06-01', 101, 'mobile', 500, 450, 1200.0),
('2024-06-01', 101, 'mobile', 300, 280, 780.0),
('2024-06-01', 101, 'desktop', 200, 190, 600.0);
```

After a merge, the two mobile rows for page 101 on 2024-06-01 will be collapsed into:

```text
2024-06-01  101  mobile   800   730   1980.0
2024-06-01  101  desktop  200   190    600.0
```

## Querying Before Merges Complete

Use `sumIf` or `sum` with GROUP BY as a safety net for pre-merge duplicates:

```sql
SELECT
    date,
    page_id,
    device,
    sum(views) AS views,
    sum(unique_users) AS unique_users
FROM page_views
WHERE date = '2024-06-01'
GROUP BY date, page_id, device
ORDER BY views DESC;
```

## Use Cases

ReplicatedSummingMergeTree is excellent for:
- Web analytics (page views, sessions)
- Billing counters (API calls, bytes transferred)
- IoT sensor aggregations
- Ad impression and click counters

## Checking Replication State

```sql
SELECT
    replica_name,
    queue_size,
    absolute_delay,
    is_leader
FROM system.replicas
WHERE table = 'page_views';
```

## Summary

ReplicatedSummingMergeTree provides storage-level pre-aggregation with replication. It reduces the data volume in your tables over time as background merges collapse rows with matching keys into summed values. Always use explicit GROUP BY with sum() in queries to handle partially merged data, and specify the columns to sum explicitly if not all numeric columns should be aggregated.
