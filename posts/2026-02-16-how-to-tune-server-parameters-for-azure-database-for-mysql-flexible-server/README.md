# How to Tune Server Parameters for Azure Database for MySQL Flexible Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, MySQL, Performance Tuning, Server Parameters, Flexible Server, Database Optimization, InnoDB

Description: A practical guide to tuning the most impactful server parameters in Azure Database for MySQL Flexible Server for better performance.

---

Azure Database for MySQL Flexible Server comes with default parameter values that work reasonably well for generic workloads. But "reasonably well" is not "optimized for your specific use case." If you are running a production workload and have not touched the server parameters, there is a good chance you are leaving performance on the table.

In this post, I will go through the most impactful server parameters you should consider tuning, explain what each one does, and give you practical guidance on how to set them.

## How Server Parameters Work in Flexible Server

Flexible Server exposes hundreds of MySQL server parameters that you can modify. Parameters fall into two categories:

- **Dynamic parameters**: Take effect immediately without a server restart.
- **Static parameters**: Require a server restart to take effect.

You can modify parameters through the Azure portal, CLI, or REST API. Some parameters are read-only and cannot be changed in the managed service.

To view the current value of a parameter:

```bash
# Check the current value of innodb_buffer_pool_size
az mysql flexible-server parameter show \
  --resource-group myResourceGroup \
  --server-name my-mysql-server \
  --name innodb_buffer_pool_size
```

To set a parameter:

```bash
# Set innodb_buffer_pool_size (static - requires restart)
az mysql flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-mysql-server \
  --name innodb_buffer_pool_size \
  --value 8589934592
```

## InnoDB Buffer Pool Size

This is the single most important parameter for MySQL performance. The InnoDB buffer pool caches data and indexes in memory. A larger buffer pool means fewer disk reads.

**Default behavior**: Azure sets this automatically based on your SKU (typically 50-70% of available RAM).

**When to tune**: If you see high disk I/O and your buffer pool hit ratio is low.

Check your buffer pool hit ratio:

```sql
-- Calculate the buffer pool hit ratio
-- Aim for 99%+ in production
SELECT
    (1 - (innodb_data_reads / innodb_buffer_pool_read_requests)) * 100
    AS buffer_pool_hit_ratio
FROM (
    SELECT
        VARIABLE_VALUE AS innodb_data_reads
    FROM performance_schema.global_status
    WHERE VARIABLE_NAME = 'Innodb_data_reads'
) a,
(
    SELECT
        VARIABLE_VALUE AS innodb_buffer_pool_read_requests
    FROM performance_schema.global_status
    WHERE VARIABLE_NAME = 'Innodb_buffer_pool_read_requests'
) b;
```

If the hit ratio is below 99%, consider increasing the buffer pool size. On Flexible Server, you can set it up to about 80% of available RAM, but leave room for connection buffers and other MySQL memory needs.

```bash
# Set buffer pool to 10 GB (for a server with 16 GB RAM)
az mysql flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-mysql-server \
  --name innodb_buffer_pool_size \
  --value 10737418240
```

## max_connections

Controls the maximum number of simultaneous client connections.

**Default**: Varies by SKU (e.g., 151 for small SKUs, higher for larger ones).

**When to tune**: When your application hits "Too many connections" errors.

```bash
# View the current max_connections value
az mysql flexible-server parameter show \
  --resource-group myResourceGroup \
  --server-name my-mysql-server \
  --name max_connections
```

Before blindly increasing this value, check if you actually need all those connections. Each connection consumes memory (roughly per-thread buffer sizes multiplied by the connection count). A better approach is usually:

1. Use connection pooling in your application.
2. Close idle connections promptly.
3. Only increase max_connections if pooling is already in place and you genuinely need more connections.

```bash
# Increase max_connections to 500
az mysql flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-mysql-server \
  --name max_connections \
  --value 500
```

## innodb_io_capacity and innodb_io_capacity_max

These parameters tell InnoDB how much I/O bandwidth is available for background operations like flushing dirty pages and merging insert buffer entries.

**Default**: `innodb_io_capacity` = 200, `innodb_io_capacity_max` = 2000

**When to tune**: When running on Premium SSD or high-IOPS storage tiers. The defaults are conservative and designed for spinning disks.

```bash
# Set I/O capacity for SSD storage
az mysql flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-mysql-server \
  --name innodb_io_capacity \
  --value 2000

az mysql flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-mysql-server \
  --name innodb_io_capacity_max \
  --value 4000
```

Set `innodb_io_capacity` to roughly 50-75% of your available IOPS, and `innodb_io_capacity_max` to your maximum IOPS.

## innodb_log_file_size

Controls the size of InnoDB redo log files. Larger log files improve write performance by allowing InnoDB to batch more writes, but increase crash recovery time.

**Default**: Typically 256 MB or 512 MB depending on the SKU.

**When to tune**: If you have heavy write workloads and see InnoDB checkpoint stalls.

Check if InnoDB is waiting on log space:

```sql
-- Check for log-related waits
SHOW ENGINE INNODB STATUS\G
-- Look for "Log sequence number" vs "Log flushed up to"
-- and "Checkpoint at" sections
```

```bash
# Increase redo log file size to 1 GB (requires restart)
az mysql flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-mysql-server \
  --name innodb_log_file_size \
  --value 1073741824
```

## tmp_table_size and max_heap_table_size

These control the maximum size of internal in-memory temporary tables. When a temporary table exceeds this size, MySQL converts it to an on-disk table, which is much slower.

**Default**: 16 MB for both.

**When to tune**: When queries create many temporary tables that spill to disk.

Check temporary table usage:

```sql
-- Check how many temporary tables went to disk
SHOW GLOBAL STATUS LIKE 'Created_tmp%';
```

If `Created_tmp_disk_tables` is a significant percentage of `Created_tmp_tables`, increase these values:

```bash
# Increase to 64 MB
az mysql flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-mysql-server \
  --name tmp_table_size \
  --value 67108864

az mysql flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-mysql-server \
  --name max_heap_table_size \
  --value 67108864
```

Both parameters must be set together since MySQL uses the smaller of the two.

## join_buffer_size and sort_buffer_size

These per-connection buffers affect join and sort operations.

**Default**: 256 KB for both.

**When to tune carefully**: Increasing these helps specific queries but can backfire because the memory is allocated per-connection, not globally. A 4 MB sort buffer with 500 connections could use 2 GB of RAM just for sorts.

```bash
# Modest increase to 1 MB (be careful with high connection counts)
az mysql flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-mysql-server \
  --name sort_buffer_size \
  --value 1048576
```

A better approach is usually to fix the queries that need large sort buffers rather than increasing the buffer globally.

## innodb_flush_log_at_trx_commit

Controls how often InnoDB flushes the redo log to disk.

| Value | Behavior | Durability | Performance |
|-------|----------|------------|-------------|
| 1 | Flush on every commit | Full ACID | Slowest |
| 2 | Flush every second | Possible 1-second loss | Faster |
| 0 | Flush every second | Possible 1-second loss | Fastest |

**Default**: 1 (full durability)

For most production workloads, keep this at 1. If you can tolerate up to one second of data loss and need better write performance, 2 is a reasonable trade-off.

```bash
# Set to 2 for better write performance (accepts minor risk)
az mysql flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-mysql-server \
  --name innodb_flush_log_at_trx_commit \
  --value 2
```

## wait_timeout and interactive_timeout

Control how long MySQL keeps idle connections open.

**Default**: 28800 seconds (8 hours)

**When to tune**: If you see too many idle connections consuming resources.

```bash
# Close idle connections after 10 minutes
az mysql flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-mysql-server \
  --name wait_timeout \
  --value 600

az mysql flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-mysql-server \
  --name interactive_timeout \
  --value 600
```

## A Systematic Tuning Approach

Rather than randomly changing parameters, follow a systematic process:

1. **Establish a baseline**: Measure current performance with your actual workload.
2. **Identify bottlenecks**: Use `SHOW GLOBAL STATUS`, `performance_schema`, and Azure Monitor metrics to find what is limiting performance.
3. **Change one parameter at a time**: If you change multiple parameters simultaneously, you will not know which one helped (or hurt).
4. **Measure the impact**: After each change, measure performance again with the same workload.
5. **Document everything**: Keep a log of what you changed, when, and what effect it had.

## Parameters You Should NOT Change

Some parameters are better left at their defaults in the managed service:

- `innodb_buffer_pool_instances`: Azure sets this appropriately for the SKU.
- `innodb_read_io_threads` and `innodb_write_io_threads`: Managed by Azure.
- `lower_case_table_names`: Cannot be changed after server creation.
- `character_set_server`: Change this only if you know exactly what you are doing.

## Summary

Parameter tuning for Azure Database for MySQL Flexible Server is about understanding your workload and making targeted adjustments. Start with the InnoDB buffer pool size, check your connection settings, and then move to I/O and memory parameters based on what your monitoring tells you. Avoid the temptation to copy-paste a "best practices" configuration from the internet - every workload is different, and what works for someone else might not work for you. Measure, adjust, measure again.
