# How to Configure MySQL Memory Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Memory, Configuration, Performance, InnoDB

Description: Learn how to configure MySQL memory usage by tuning the InnoDB buffer pool, sort buffers, and connection memory to match your server's available RAM.

---

MySQL uses memory for caching data pages, sorting query results, building joins, and managing connections. Properly configuring memory usage is one of the highest-impact tuning activities for MySQL performance. Over-allocation causes swap usage and crashes; under-allocation leaves performance gains on the table.

## Key Memory Areas

MySQL allocates memory in several pools:

- **InnoDB buffer pool** - Caches data pages and indexes, the largest and most important allocation
- **Sort buffer** - Per-session buffer for ORDER BY and GROUP BY operations
- **Join buffer** - Per-session buffer for joins without indexes
- **Read buffer** - Used by sequential scans in MyISAM (less relevant with InnoDB)
- **Connection memory** - Per-thread overhead for each connected client

## Configuring the InnoDB Buffer Pool

The buffer pool should be the primary focus. A common guideline is 70-80% of available RAM on a dedicated database server:

```ini
[mysqld]
innodb_buffer_pool_size = 12G
innodb_buffer_pool_instances = 8
```

Use multiple instances to reduce mutex contention when `innodb_buffer_pool_size` exceeds 1 GB. Each instance manages an independent portion of the pool.

Verify the current setting:

```sql
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';
```

## Resizing the Buffer Pool at Runtime

MySQL 8.0 supports online buffer pool resizing without a restart:

```sql
SET GLOBAL innodb_buffer_pool_size = 8589934592;  -- 8GB in bytes
```

Monitor the resizing progress:

```sql
SHOW STATUS LIKE 'Innodb_buffer_pool_resize_status';
```

## Configuring Per-Session Buffers

Per-session buffers are allocated for each active query that needs them. Setting them too large multiplies by connection count:

```ini
[mysqld]
sort_buffer_size = 4M
join_buffer_size = 4M
read_rnd_buffer_size = 4M
```

With 200 connections, each at peak usage, `sort_buffer_size = 4M` can consume 800 MB. Scale these conservatively.

## Estimating Total Memory Consumption

Use this formula as a rough estimate:

```text
Total RAM = innodb_buffer_pool_size
          + key_buffer_size (MyISAM)
          + max_connections * (sort_buffer_size + join_buffer_size + read_rnd_buffer_size + thread_stack + binlog_cache_size)
          + overhead (OS, MySQL threads, query cache remnants)
```

Run the following to check current per-thread memory use:

```sql
SELECT * FROM performance_schema.memory_summary_global_by_event_name
WHERE event_name LIKE 'memory/sql/%'
ORDER BY CURRENT_NUMBER_OF_BYTES_USED DESC
LIMIT 10;
```

## Setting the Maximum Connection Count

Limit connections to prevent memory exhaustion during traffic spikes:

```ini
[mysqld]
max_connections = 200
```

Check how close you are to the limit:

```sql
SHOW STATUS LIKE 'Max_used_connections';
SHOW VARIABLES LIKE 'max_connections';
```

## Thread Cache

Reusing threads avoids the overhead of creating new OS threads for each connection:

```ini
[mysqld]
thread_cache_size = 16
```

## Summary

MySQL memory tuning centers on the InnoDB buffer pool, which should receive the largest share of available RAM. Set per-session buffers conservatively and multiply by `max_connections` to estimate peak consumption. Use MySQL 8.0 online buffer pool resizing for production changes, and monitor actual memory use through the `performance_schema` memory tables to validate your configuration.
