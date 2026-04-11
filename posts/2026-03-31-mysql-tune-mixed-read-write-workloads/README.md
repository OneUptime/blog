# How to Tune MySQL for Mixed Read-Write Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Performance, Tuning, Workload, Optimization

Description: Tune MySQL for mixed read-write workloads by balancing buffer pool configuration, InnoDB flush settings, and connection management to serve both query types efficiently.

---

Mixed read-write workloads are the most common in production applications - think social platforms, SaaS products, or content management systems where users both create content and read it simultaneously. Tuning for this pattern requires balancing read caching with write throughput.

## Understanding Your Read/Write Ratio

Before tuning, measure the actual workload ratio:

```sql
SELECT
  (SELECT variable_value FROM performance_schema.global_status WHERE variable_name = 'Com_select') AS reads,
  (
    (SELECT variable_value FROM performance_schema.global_status WHERE variable_name = 'Com_insert') +
    (SELECT variable_value FROM performance_schema.global_status WHERE variable_name = 'Com_update') +
    (SELECT variable_value FROM performance_schema.global_status WHERE variable_name = 'Com_delete')
  ) AS writes,
  ROUND(
    (SELECT variable_value FROM performance_schema.global_status WHERE variable_name = 'Com_select') /
    (
      (SELECT variable_value FROM performance_schema.global_status WHERE variable_name = 'Com_select') +
      (SELECT variable_value FROM performance_schema.global_status WHERE variable_name = 'Com_insert') +
      (SELECT variable_value FROM performance_schema.global_status WHERE variable_name = 'Com_update') +
      (SELECT variable_value FROM performance_schema.global_status WHERE variable_name = 'Com_delete')
    ) * 100,
    1
  ) AS read_pct;
```

A 70% read / 30% write ratio is common for web applications.

## InnoDB Configuration for Mixed Workloads

```text
[mysqld]
# Allocate 60-70% of RAM - leave more room than pure read
innodb_buffer_pool_size = 16G
innodb_buffer_pool_instances = 8

# Balance between durability and write performance
innodb_flush_log_at_trx_commit = 1
sync_binlog = 1

# Redo log for write bursts
innodb_redo_log_capacity = 2G

# I/O threads balanced for both reads and writes
innodb_read_io_threads = 4
innodb_write_io_threads = 4

# Adaptive flushing helps maintain stable performance under mixed load
innodb_adaptive_flushing = ON
innodb_adaptive_flushing_lwm = 10
```

## Monitoring Buffer Pool Dirty Pages

With mixed workloads, dirty page buildup can cause periodic write stalls. Monitor the dirty page ratio:

```sql
SELECT
  variable_name,
  variable_value
FROM performance_schema.global_status
WHERE variable_name IN (
  'Innodb_buffer_pool_pages_total',
  'Innodb_buffer_pool_pages_dirty',
  'Innodb_buffer_pool_pages_free'
);

-- Calculate dirty page percentage
SELECT
  ROUND(
    (SELECT variable_value FROM performance_schema.global_status WHERE variable_name = 'Innodb_buffer_pool_pages_dirty') /
    (SELECT variable_value FROM performance_schema.global_status WHERE variable_name = 'Innodb_buffer_pool_pages_total') * 100,
    2
  ) AS dirty_page_pct;
```

If dirty page percentage consistently exceeds 75%, increase `innodb_io_capacity` to flush more aggressively.

## Query Routing for Mixed Workloads

Use ProxySQL to route write transactions to the primary and reads to replicas:

```text
mysql_query_rules =
(
  {
    rule_id = 1,
    active = 1,
    match_digest = "^SELECT.*FOR UPDATE",
    destination_hostgroup = 10,
    apply = 1,
    comment = "Writes and locking reads to primary"
  },
  {
    rule_id = 2,
    active = 1,
    match_pattern = "^(BEGIN|START TRANSACTION|COMMIT|ROLLBACK)",
    destination_hostgroup = 10,
    apply = 1
  },
  {
    rule_id = 3,
    active = 1,
    match_pattern = "^SELECT",
    destination_hostgroup = 20,
    apply = 1,
    comment = "Non-locking reads to replicas"
  }
)
```

## Index Strategy for Mixed Workloads

Write operations pay a cost for every index that must be maintained. Balance read performance with write overhead:

```sql
-- Check unused indexes that slow writes without helping reads
SELECT
  t.TABLE_SCHEMA,
  t.TABLE_NAME,
  t.INDEX_NAME,
  s.COUNT_FETCH AS count_read,
  (s.COUNT_INSERT + s.COUNT_UPDATE + s.COUNT_DELETE) AS count_write
FROM information_schema.STATISTICS t
LEFT JOIN performance_schema.table_io_waits_summary_by_index_usage s
  ON t.TABLE_SCHEMA = s.OBJECT_SCHEMA
  AND t.TABLE_NAME = s.OBJECT_NAME
  AND t.INDEX_NAME = s.INDEX_NAME
WHERE s.COUNT_FETCH = 0
  AND t.INDEX_NAME != 'PRIMARY'
ORDER BY (s.COUNT_INSERT + s.COUNT_UPDATE + s.COUNT_DELETE) DESC;
```

## Summary

Tuning MySQL for mixed read-write workloads starts with measuring the actual read/write ratio and sizing the buffer pool to keep the most-accessed data in memory without over-allocating. Set `innodb_adaptive_flushing = ON` to prevent dirty page buildup from causing write stalls. Use ProxySQL to route reads to replicas once the primary reaches capacity, and audit unused indexes to reduce write overhead on tables that receive heavy INSERT and UPDATE traffic.
