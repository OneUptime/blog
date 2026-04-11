# How to Tune MySQL for Read-Heavy Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Performance, Tuning, Read, Optimization

Description: Tune MySQL for read-heavy workloads by maximizing buffer pool size, enabling query caching alternatives, and routing reads to replicas for horizontal scaling.

---

Read-heavy workloads - where 80% or more of operations are SELECT queries - benefit from aggressive caching, optimal indexing, and read scale-out. The goal is to serve as many reads as possible from memory without touching disk.

## Maximize InnoDB Buffer Pool

The most impactful setting for read-heavy workloads is `innodb_buffer_pool_size`. For a dedicated MySQL server, allocate 70-80% of RAM:

```sql
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';

-- Check current hit ratio
SELECT
  ROUND(
    (1 - (
      (SELECT variable_value FROM performance_schema.global_status WHERE variable_name = 'Innodb_buffer_pool_reads') /
      (SELECT variable_value FROM performance_schema.global_status WHERE variable_name = 'Innodb_buffer_pool_read_requests')
    )) * 100,
    4
  ) AS buffer_pool_hit_ratio_pct;
```

Aim for a hit ratio above 99%. Set in configuration:

```text
[mysqld]
innodb_buffer_pool_size = 48G
innodb_buffer_pool_instances = 8
innodb_buffer_pool_dump_at_shutdown = ON
innodb_buffer_pool_load_at_startup = ON
```

The dump/load settings preserve the warm buffer pool across restarts, preventing cold-start performance degradation.

## Tune Read-Ahead Settings

InnoDB prefetches pages it predicts will be needed. Tune these for sequential reads:

```text
[mysqld]
innodb_read_ahead_threshold = 56
innodb_random_read_ahead = OFF
innodb_read_io_threads = 8
```

## Optimize for Read Scalability with Replicas

For very high read volumes, add read replicas and route SELECT queries to them:

```sql
-- On primary: verify binary logging is enabled
SHOW VARIABLES LIKE 'log_bin';
SHOW VARIABLES LIKE 'binlog_format';
```

ProxySQL configuration for read/write splitting:

```text
mysql_query_rules =
(
  {
    rule_id = 1,
    active = 1,
    match_digest = "^SELECT.*FOR UPDATE",
    destination_hostgroup = 10,
    apply = 1
  },
  {
    rule_id = 2,
    active = 1,
    match_pattern = "^SELECT",
    destination_hostgroup = 20,
    apply = 1
  }
)
```

## Index Optimization for Reads

Ensure covering indexes exist for the most common read patterns:

```sql
-- Identify the most-executed SELECT queries
SELECT
  DIGEST_TEXT,
  COUNT_STAR,
  ROUND(AVG_TIMER_WAIT / 1000000000000, 3) AS avg_sec
FROM performance_schema.events_statements_summary_by_digest
WHERE DIGEST_TEXT LIKE 'SELECT%'
ORDER BY COUNT_STAR DESC
LIMIT 10;

-- Create a covering index for a high-frequency query
ALTER TABLE orders ADD INDEX idx_status_created_covering
  (status, created_at, customer_id, total_amount);

-- Verify the index is used
EXPLAIN SELECT customer_id, total_amount
FROM orders
WHERE status = 'completed'
ORDER BY created_at DESC
LIMIT 50;
```

## Disable Unnecessary Write Operations

For read-heavy servers, reduce write overhead from InnoDB:

```text
[mysqld]
innodb_flush_log_at_trx_commit = 2
innodb_doublewrite = 1
performance_schema = ON
```

On read-only replica servers, you can set:

```text
[mysqld]
read_only = ON
super_read_only = ON
skip_slave_start = ON
```

## Summary

Tuning MySQL for read-heavy workloads centers on maximizing the InnoDB buffer pool hit ratio through generous memory allocation, preserving buffer pool warmth across restarts, and creating covering indexes for frequent queries. As read volume grows beyond what a single server can handle, deploy read replicas and route SELECT traffic with ProxySQL. Disable aggressive write-safety settings on replica servers to reduce I/O overhead since durability is guaranteed by the primary.
