# ClickHouse MergeTree Variants Feature Comparison

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, MergeTree, Table Engine, Comparison, Data Modeling

Description: A feature comparison of ClickHouse MergeTree engine variants - ReplacingMergeTree, SummingMergeTree, AggregatingMergeTree, CollapsingMergeTree, and VersionedCollapsingMergeTree.

---

## MergeTree Engine Family Overview

All ClickHouse MergeTree variants share the same columnar storage, primary index, TTL, and replication capabilities. They differ in what happens during background merges - specifically how they handle duplicate or related rows.

## Feature Comparison Table

```text
Engine                    | Deduplication | Aggregation | Collapse | Best Use Case
--------------------------|---------------|-------------|----------|-----------------------------
MergeTree                 | No            | No          | No       | Raw event/log storage
ReplacingMergeTree        | Yes (by ver)  | No          | No       | Latest-state dimension tables
SummingMergeTree          | Partial sum   | Sum only    | No       | Pre-aggregated metrics
AggregatingMergeTree      | Yes (AggState)| Any         | No       | Materialized view targets
CollapsingMergeTree       | Sign-based    | No          | Yes      | OLAP with update patterns
VersionedCollapsingMergeTree | Sign+ver  | No          | Yes      | Unordered update streams
```

## MergeTree - Plain Storage

```sql
CREATE TABLE events (
  event_id   UInt64,
  user_id    UInt64,
  event_time DateTime
) ENGINE = MergeTree()
ORDER BY (user_id, event_time);
```

No merge-time transformations. All rows are kept.

## ReplacingMergeTree - Latest State

```sql
CREATE TABLE users (
  user_id    UInt64,
  name       String,
  status     String,
  updated_at DateTime
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY user_id;
```

During merges, keeps only the row with the highest `updated_at` per `user_id`. Use `FINAL` for consistent reads.

## SummingMergeTree - Pre-Aggregated Sums

```sql
CREATE TABLE hourly_stats (
  hour       DateTime,
  user_id    UInt64,
  page_views UInt64,
  revenue    Decimal(12,2)
) ENGINE = SummingMergeTree()
ORDER BY (user_id, hour);
```

Merges rows with the same key by summing numeric columns. Non-numeric, non-key columns retain an arbitrary value from the merged rows.

## AggregatingMergeTree - Flexible Aggregation

```sql
CREATE TABLE user_daily_agg (
  user_id UInt64,
  day     Date,
  visits  AggregateFunction(count),
  revenue AggregateFunction(sum, Decimal(12,2))
) ENGINE = AggregatingMergeTree()
ORDER BY (user_id, day);
```

Used as materialized view targets. Supports any aggregate function via `AggregateFunction` columns.

## CollapsingMergeTree - Sign-Based Updates

```sql
CREATE TABLE order_states (
  order_id UInt64,
  amount   Decimal(12,2),
  sign     Int8
) ENGINE = CollapsingMergeTree(sign)
ORDER BY order_id;

-- To update: insert -1 row for old state, +1 for new state
INSERT INTO order_states VALUES (101, 50.00, -1);  -- cancel old
INSERT INTO order_states VALUES (101, 55.00, 1);   -- new state
```

## VersionedCollapsingMergeTree

Like CollapsingMergeTree but with an explicit version column to handle out-of-order rows from distributed producers.

```sql
CREATE TABLE order_states (
  order_id UInt64,
  amount   Decimal(12,2),
  version  UInt64,
  sign     Int8
) ENGINE = VersionedCollapsingMergeTree(sign, version)
ORDER BY order_id;
```

## Summary

Choose MergeTree for raw events, ReplacingMergeTree for mutable dimension tables, SummingMergeTree for simple pre-aggregated counters, AggregatingMergeTree as a materialized view backing store, and CollapsingMergeTree or VersionedCollapsingMergeTree when you need in-place updates via sign-based cancellation. The right engine choice eliminates the need for expensive queries or application-level deduplication logic.
