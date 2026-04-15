# How to Handle Mixed Workloads (OLTP + OLAP) with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, OLAP, OLTP, Mixed Workload, Workload Isolation, Resource Group

Description: Strategies for running mixed OLTP and OLAP workloads in ClickHouse, including resource groups, priority queues, and architectural separation patterns.

---

## The Challenge of Mixed Workloads

ClickHouse is purpose-built for OLAP: large analytical scans over billions of rows. OLTP workloads (frequent small inserts, single-row lookups, frequent updates) conflict with this design. Running both on the same cluster degrades both workloads. Understanding where to compromise - and where to separate - is key.

## What ClickHouse Can and Cannot Do

ClickHouse handles well:
- High-throughput batch inserts (millions of rows/second)
- Analytical aggregations over large time ranges
- Materialized view refreshes

ClickHouse handles poorly:
- Single-row updates and deletes (use mutations, which are async and expensive)
- Point lookups with no primary key filter
- Transactions

## Approach 1 - Use Workload Groups (Resource Limits)

ClickHouse supports user-level and query-level resource limits to separate workloads:

```sql
CREATE USER analytics_user IDENTIFIED WITH sha256_password BY 'pass123'
SETTINGS
    max_memory_usage = 10000000000,
    max_execution_time = 60,
    priority = 1;

CREATE USER operational_user IDENTIFIED WITH sha256_password BY 'pass456'
SETTINGS
    max_memory_usage = 2000000000,
    max_execution_time = 5,
    priority = 10;
```

Lower `priority` values get more CPU scheduling priority (priority `1` runs before priority `10`).

## Approach 2 - Separate Insert and Query Paths

Route inserts through one node and queries through another using ClickHouse's distributed setup:

```text
Writers --> shard1 (insert-optimized)
Readers --> shard2/3 (query-optimized replicas)
```

This prevents heavy analytic scans from blocking insert processing.

## Approach 3 - Use ReplacingMergeTree for Upserts

For OLTP-style updates, use `ReplacingMergeTree` with version columns:

```sql
CREATE TABLE user_state (
    user_id  UInt64,
    status   LowCardinality(String),
    updated  DateTime,
    _ver     UInt64
) ENGINE = ReplacingMergeTree(_ver)
ORDER BY user_id;
```

Insert a new row to update - deduplication happens during merges. For immediate consistency, use `FINAL`:

```sql
SELECT * FROM user_state FINAL WHERE user_id = 42;
```

## Throttling Heavy Queries

Protect operational queries from analytical scans using query settings:

```sql
SELECT count(*) FROM events
WHERE ts >= today()
SETTINGS max_threads = 4, max_execution_time = 30;
```

## Monitoring Workload Mix

Track query types and resource consumption:

```sql
SELECT
    user,
    query_kind,
    count() AS query_count,
    sum(memory_usage) AS total_mem,
    avg(query_duration_ms) AS avg_ms
FROM system.query_log
WHERE event_date = today()
GROUP BY user, query_kind
ORDER BY total_mem DESC;
```

## Summary

ClickHouse handles mixed workloads best with resource groups for priority separation, replica-based routing to isolate reads from writes, and ReplacingMergeTree for upsert patterns. For heavy transactional requirements, consider a dedicated OLTP database that feeds ClickHouse via CDC rather than running both workloads on the same cluster.
