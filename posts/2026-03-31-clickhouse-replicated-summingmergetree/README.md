# How to Use ReplicatedSummingMergeTree in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ReplicatedSummingMergeTree, Replication, Aggregation, Storage Engine

Description: Learn how to use ReplicatedSummingMergeTree in ClickHouse to automatically sum numeric columns during background merges across replicated nodes for scalable counters.

---

`ReplicatedSummingMergeTree` combines `SummingMergeTree` with ClickHouse replication. During background merges, rows that share the same `ORDER BY` key are collapsed into one row by summing all numeric columns. Replication ensures the table and all merge operations are synchronized across replicas via ZooKeeper or ClickHouse Keeper. This engine is ideal for distributed counters, revenue rollups, and usage aggregations where you write increments frequently and want automatic summation with high availability.

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

## Creating a ReplicatedSummingMergeTree Table

```sql
-- Run on each replica
CREATE TABLE daily_revenue
(
    event_date   Date,
    country      LowCardinality(String),
    product_id   UInt32,
    order_count  UInt64,        -- summed during merge
    revenue      Decimal(12, 2),-- summed during merge
    refund_count UInt64,        -- summed during merge
    refund_amount Decimal(12, 2)-- summed during merge
)
ENGINE = ReplicatedSummingMergeTree(
    '/clickhouse/tables/{shard}/daily_revenue',
    '{replica}'
)
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, country, product_id);
```

All numeric columns outside the `ORDER BY` key are summed during merges. Columns in `ORDER BY` are dimension columns and are never summed, regardless of their type.

## Inserting Increments

Write increments throughout the day. Each batch is a partial count that will be summed during merges.

```sql
-- Morning batch
INSERT INTO daily_revenue VALUES
    ('2024-06-15', 'US', 101, 12, 1199.88, 0, 0.00),
    ('2024-06-15', 'DE',  55,  8,  639.92, 1, 79.99),
    ('2024-06-15', 'JP',  22,  5,  249.95, 0, 0.00);

-- Afternoon batch - same keys, different increments
INSERT INTO daily_revenue VALUES
    ('2024-06-15', 'US', 101, 18, 1799.82, 1, 99.99),
    ('2024-06-15', 'DE',  55,  3,  239.97, 0, 0.00);
```

Before merges run, both rows exist. After the merge for `('2024-06-15', 'US', 101)`:

```text
event_date   country  product_id  order_count  revenue   refund_count  refund_amount
2024-06-15   US       101         30           2999.70   1             99.99
```

## Querying: Always Sum to Account for Unmerged Parts

Even before background merges, always `SUM()` when querying to get correct totals.

```sql
SELECT
    event_date,
    country,
    sum(order_count)   AS total_orders,
    sum(revenue)       AS total_revenue,
    sum(refund_count)  AS total_refunds,
    sum(refund_amount) AS total_refund_amount,
    round(sum(refund_count) / nullif(sum(order_count), 0) * 100, 2) AS refund_rate_pct
FROM daily_revenue
WHERE event_date BETWEEN '2024-06-01' AND '2024-06-15'
GROUP BY event_date, country
ORDER BY event_date DESC, total_revenue DESC;
```

## Specifying Which Columns to Sum

By default all numeric columns are summed. You can restrict summation to specific columns.

```sql
CREATE TABLE user_activity_summary
(
    activity_date  Date,
    user_id        UInt64,
    plan           LowCardinality(String),  -- NOT summed (String)
    session_count  UInt32,                  -- summed
    page_views     UInt64,                  -- summed
    time_on_site_s UInt64,                  -- summed
    purchases      UInt32                   -- summed
)
ENGINE = ReplicatedSummingMergeTree(
    '/clickhouse/tables/{shard}/user_activity_summary',
    '{replica}',
    (session_count, page_views, time_on_site_s, purchases)  -- explicit sum columns
)
PARTITION BY toYYYYMM(activity_date)
ORDER BY (activity_date, user_id);
```

When explicit columns are listed, only those columns are summed; all others retain the value from the first row in the merge group.

## Real-Time Counter Pattern

```sql
-- Track API call counts per endpoint per minute
CREATE TABLE api_call_counts
(
    minute_ts  DateTime,
    endpoint   LowCardinality(String),
    status     UInt16,
    call_count UInt64,
    error_count UInt64,
    total_latency_ms UInt64
)
ENGINE = ReplicatedSummingMergeTree(
    '/clickhouse/tables/{shard}/api_call_counts',
    '{replica}'
)
PARTITION BY toDate(minute_ts)
ORDER BY (minute_ts, endpoint, status);

-- Each application instance inserts its per-minute counters
INSERT INTO api_call_counts VALUES
    ('2024-06-15 10:05:00', '/api/search', 200, 340, 0,  68000),
    ('2024-06-15 10:05:00', '/api/search', 500,   2, 2,    900),
    ('2024-06-15 10:05:00', '/api/orders', 200,  88, 0,  22000);

-- Dashboard query: last 5 minutes of API activity
SELECT
    minute_ts,
    endpoint,
    status,
    sum(call_count)           AS calls,
    sum(error_count)          AS errors,
    round(sum(total_latency_ms) / nullif(sum(call_count), 0), 1) AS avg_latency_ms
FROM api_call_counts
WHERE minute_ts >= now() - INTERVAL 5 MINUTE
GROUP BY minute_ts, endpoint, status
ORDER BY minute_ts DESC, calls DESC;
```

## Replication Status Check

```sql
SELECT
    replica_name,
    is_leader,
    absolute_delay AS lag_s,
    queue_size
FROM system.replicas
WHERE table = 'daily_revenue';
```

```text
replica_name  is_leader  lag_s  queue_size
replica-01    1          0      0
replica-02    0          0      0
```

## Forcing a Merge

```sql
-- Collapse all increments in the June 2024 partition into final sums
OPTIMIZE TABLE daily_revenue PARTITION '202406' FINAL;
```

After this, each `(event_date, country, product_id)` key has exactly one row with the total sum.

## Negative Increments for Adjustments

`SummingMergeTree` supports negative values, which makes it natural for adjustments and cancellations.

```sql
-- Record a refund as a negative revenue increment
INSERT INTO daily_revenue VALUES
    ('2024-06-15', 'US', 101, -1, -99.99, 1, 99.99);
```

After the merge, the net revenue reflects the refund.

## Limitations

- Summation is eventual - duplicates exist between merges. Always `SUM()` in queries.
- Non-numeric non-ORDER-BY columns retain the value from an arbitrary row in the merge group.
- Requires ZooKeeper/ClickHouse Keeper.
- Not suitable for tracking individual row history (use ReplicatedReplacingMergeTree for that).

## Summary

`ReplicatedSummingMergeTree` is the replicated, highly available version of `SummingMergeTree`. Write incremental numeric data freely; background merges automatically sum rows with the same `ORDER BY` key. Always aggregate with `SUM()` at query time to handle parts that have not yet merged. Use negative increments for adjustments and cancellations.
