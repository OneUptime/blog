# How to Profile Query Execution with SHOW PROFILE in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SHOW PROFILE, Query Profiling, Performance, Optimization

Description: Learn how to use SHOW PROFILE in MySQL to measure time spent in each phase of query execution and identify bottlenecks.

---

## Overview

`SHOW PROFILE` is a MySQL diagnostic tool that shows the time spent in each phase of query execution. While `EXPLAIN` tells you the query plan, `SHOW PROFILE` tells you where the actual time goes: parsing, optimization, locking, sorting, sending data, etc.

Note: `SHOW PROFILE` is deprecated as of MySQL 5.6.7 in favor of the Performance Schema, but it remains available in MySQL 8.x and is still widely used for quick profiling.

## Enabling Profiling

Profiling is disabled by default. Enable it for your session:

```sql
SET profiling = 1;
```

## Running a Query and Viewing the Profile

```sql
-- Enable profiling
SET profiling = 1;

-- Run the query you want to profile
SELECT o.id, o.total, u.email
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status = 'paid'
ORDER BY o.created_at DESC
LIMIT 100;

-- View the list of profiled queries
SHOW PROFILES;
```

```text
+----------+------------+--------------------------------------------------+
| Query_ID | Duration   | Query                                            |
+----------+------------+--------------------------------------------------+
|        1 | 0.12453200 | SELECT o.id, o.total, u.email FROM orders o ...  |
+----------+------------+--------------------------------------------------+
```

## Viewing Detailed Timing Breakdown

```sql
SHOW PROFILE FOR QUERY 1;
```

```text
+----------------------+----------+
| Status               | Duration |
+----------------------+----------+
| starting             | 0.000082 |
| checking permissions | 0.000008 |
| Opening tables       | 0.000025 |
| init                 | 0.000019 |
| System lock          | 0.000010 |
| optimizing           | 0.000012 |
| statistics           | 0.000043 |
| preparing            | 0.000018 |
| Sorting result       | 0.000005 |
| executing            | 0.000003 |
| Sending data         | 0.123876 |
| end                  | 0.000007 |
| query end            | 0.000008 |
| closing tables       | 0.000006 |
| freeing items        | 0.000011 |
| cleaning up          | 0.000005 |
+----------------------+----------+
```

In this example, `Sending data` takes 99% of the time, indicating a large result set or expensive row fetching.

## Profiling CPU and I/O

Get more detail by specifying what to measure:

```sql
-- CPU usage
SHOW PROFILE CPU FOR QUERY 1;
```

```text
+----------------------+----------+----------+------------+
| Status               | Duration | CPU_user | CPU_system |
+----------------------+----------+----------+------------+
| starting             | 0.000082 | 0.000000 | 0.000000   |
| Sending data         | 0.123876 | 0.115000 | 0.008000   |
+----------------------+----------+----------+------------+
```

```sql
-- Block I/O operations
SHOW PROFILE BLOCK IO FOR QUERY 1;
```

```text
+----------------------+----------+-------------+--------------+
| Status               | Duration | Block_ops_in | Block_ops_out |
+----------------------+----------+-------------+--------------+
| Sending data         | 0.123876 | 1240        | 0            |
+----------------------+----------+-------------+--------------+
```

## Available Profile Types

```sql
SHOW PROFILE ALL FOR QUERY 1;           -- All available info
SHOW PROFILE CPU FOR QUERY 1;           -- CPU usage
SHOW PROFILE BLOCK IO FOR QUERY 1;      -- Block I/O
SHOW PROFILE IPC FOR QUERY 1;           -- Interprocess communication
SHOW PROFILE MEMORY FOR QUERY 1;        -- Memory (not currently implemented)
SHOW PROFILE PAGE FAULTS FOR QUERY 1;   -- Major and minor page faults
SHOW PROFILE CONTEXT SWITCHES FOR QUERY 1; -- Voluntary and involuntary context switches
SHOW PROFILE SWAPS FOR QUERY 1;         -- Swap counts
SHOW PROFILE SOURCE FOR QUERY 1;        -- Source code location
```

## Interpreting Common Bottlenecks

| Status | High Duration Means |
|--------|---------------------|
| `Sending data` | Large result set, expensive row reads, or slow network |
| `Sorting result` | No covering index for ORDER BY |
| `Creating sort index` | Large in-memory or disk sort |
| `statistics` | Stale index statistics - run ANALYZE TABLE |
| `System lock` | Table locking contention |
| `Opening tables` | Table cache too small |

## Profiling Multiple Queries

```sql
SET profiling = 1;

-- Query 1: without index
SELECT * FROM orders WHERE status = 'pending';

-- Query 2: with FORCE INDEX
SELECT * FROM orders FORCE INDEX (idx_status) WHERE status = 'pending';

SHOW PROFILES;
-- Compare durations to see which approach is faster
```

## Disabling Profiling

```sql
SET profiling = 0;
```

Profiling adds overhead, so disable it when not actively profiling.

## Summary

`SHOW PROFILE` provides a detailed timing breakdown of each phase of MySQL query execution, from parsing and optimization to locking and data transmission. Enable it with `SET profiling = 1`, run your query, then use `SHOW PROFILES` to find the query ID and `SHOW PROFILE FOR QUERY N` to see per-phase timings. Focus on phases with the highest duration, such as `Sending data` or `Sorting result`, to identify the specific bottleneck to address.
