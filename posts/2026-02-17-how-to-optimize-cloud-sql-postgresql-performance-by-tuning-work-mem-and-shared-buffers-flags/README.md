# How to Optimize Cloud SQL PostgreSQL Performance by Tuning work_mem and shared_buffers Flags

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, PostgreSQL, Performance Tuning, Database

Description: Learn how to tune work_mem and shared_buffers database flags in Cloud SQL for PostgreSQL to significantly improve query performance and memory utilization.

---

If you have ever watched a Cloud SQL PostgreSQL instance struggle through complex queries or noticed that your database is spilling sorts to disk, you are likely dealing with suboptimal memory configuration. Two of the most impactful flags you can tune are `work_mem` and `shared_buffers`. Getting these right can transform your database performance without upgrading your instance.

## Understanding shared_buffers

The `shared_buffers` parameter controls how much memory PostgreSQL dedicates to caching data in memory. When a query needs data, PostgreSQL first checks the shared buffer cache before going to disk. A larger shared buffer pool means more data stays in memory, reducing expensive disk reads.

In Cloud SQL, the default `shared_buffers` is typically set to about 33 percent of the instance's total RAM. For many workloads, this is reasonable, but it is not always optimal. If your workload involves repeated reads of the same data, increasing this value can help.

You can check the current setting by running this query in your PostgreSQL client:

```sql
-- Show current shared_buffers setting
SHOW shared_buffers;
```

To see how effectively your shared buffers are being used, query the buffer cache hit ratio:

```sql
-- Calculate buffer cache hit ratio - aim for 99% or higher
SELECT
  sum(heap_blks_read) AS heap_read,
  sum(heap_blks_hit) AS heap_hit,
  round(sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read))::numeric, 4) AS ratio
FROM pg_statio_user_tables;
```

A hit ratio below 99 percent is a signal that you might benefit from increasing `shared_buffers`.

## Understanding work_mem

While `shared_buffers` is about caching data, `work_mem` controls how much memory is available for individual query operations like sorts, hash joins, and hash aggregations. When a sort operation exceeds `work_mem`, PostgreSQL writes temporary data to disk, which is dramatically slower.

The default `work_mem` in Cloud SQL is typically 4MB. That might sound small, and for complex analytical queries, it often is. But here is the catch - `work_mem` is allocated per sort operation per connection. A single complex query with multiple sort steps might allocate `work_mem` several times. Multiply that by your concurrent connections, and you can see how aggressive settings can eat through memory fast.

Check whether your queries are spilling to disk:

```sql
-- Find queries that are using temporary files (disk spills)
SELECT
  query,
  temp_files,
  temp_bytes / 1024 / 1024 AS temp_mb
FROM pg_stat_statements
WHERE temp_files > 0
ORDER BY temp_bytes DESC
LIMIT 20;
```

## Tuning shared_buffers in Cloud SQL

To modify `shared_buffers` in Cloud SQL, you use database flags through the GCP Console or gcloud CLI. This change requires a restart.

Here is how to set it using gcloud:

```bash
# Set shared_buffers to 40% of instance RAM (for a 16GB instance, ~6.5GB)
# This requires a database restart
gcloud sql instances patch my-instance \
  --database-flags shared_buffers=6710886400
```

Note that Cloud SQL expects the value in bytes for `shared_buffers`. Here are some guidelines based on instance RAM:

- 4GB instance: Try 1.5GB to 1.8GB (1610612736 to 1932735283 bytes)
- 8GB instance: Try 3GB to 3.5GB (3221225472 to 3758096384 bytes)
- 16GB instance: Try 5GB to 7GB (5368709120 to 7516192768 bytes)
- 32GB instance: Try 10GB to 12GB (10737418240 to 12884901888 bytes)

Going beyond 40 percent of total RAM for `shared_buffers` rarely helps because the operating system file cache also plays an important role, and you need to leave room for `work_mem` allocations and other processes.

## Tuning work_mem in Cloud SQL

Adjusting `work_mem` does not require a restart. You can set it at the instance level or per session.

```bash
# Set work_mem to 32MB at the instance level (no restart needed)
gcloud sql instances patch my-instance \
  --database-flags work_mem=33554432
```

You can also set it per session for specific workloads:

```sql
-- Temporarily increase work_mem for an analytical session
SET work_mem = '64MB';

-- Run your complex query
SELECT department, count(*), avg(salary)
FROM employees
GROUP BY department
ORDER BY count(*) DESC;

-- Reset to default
RESET work_mem;
```

The per-session approach is particularly useful when you have a mix of simple OLTP queries and occasional complex reports. Keep the instance-level `work_mem` conservative and bump it up only for sessions that need it.

## Calculating the Right work_mem

Here is a practical formula. Take your available memory (total RAM minus shared_buffers minus OS overhead of about 1-2GB), then divide by the maximum number of concurrent connections you expect, then divide again by the average number of sort operations per query (usually 2-4).

```
available_for_work = total_ram - shared_buffers - 2GB
work_mem = available_for_work / max_connections / avg_sorts_per_query
```

For a 16GB instance with 6GB of shared_buffers, 100 max connections, and an average of 3 sorts per query:

```
available = 16GB - 6GB - 2GB = 8GB
work_mem = 8GB / 100 / 3 = ~27MB
```

So 32MB would be a reasonable setting in this case.

## Monitoring After Changes

After tuning these flags, monitor the impact. Cloud SQL exposes useful metrics in Cloud Monitoring.

Track these specific metrics:

```sql
-- Check if sort operations are now in memory
SELECT
  relname,
  seq_scan,
  idx_scan,
  n_tup_ins,
  n_tup_upd
FROM pg_stat_user_tables
ORDER BY seq_scan DESC
LIMIT 10;
```

You should also watch the Cloud Monitoring metrics for your Cloud SQL instance:

- `database/memory/utilization` - make sure you are not running out of memory
- `database/disk/read_ops_count` - this should decrease after increasing shared_buffers
- `database/postgresql/temp_bytes_written` - this should decrease after increasing work_mem

## Common Pitfalls

There are a few mistakes I see regularly when people tune these values.

First, setting `work_mem` too high at the instance level. If you set it to 256MB and you have 200 connections each running queries with multiple sort operations, you could easily run out of memory and crash the instance.

Second, changing `shared_buffers` without monitoring the aftermath. If you increase it too much, you leave insufficient memory for the OS cache and work_mem allocations, which can actually make things worse.

Third, forgetting that Cloud SQL has its own overhead. The managed service itself uses some memory, so you cannot allocate every byte of your instance RAM to PostgreSQL.

## A Practical Tuning Workflow

Here is the approach I recommend:

1. Start by checking your buffer cache hit ratio. If it is above 99 percent, your `shared_buffers` is probably fine.
2. Check for temp file usage via `pg_stat_statements`. If queries are spilling to disk, `work_mem` needs attention.
3. Make one change at a time. Adjust `work_mem` first since it does not require a restart.
4. Monitor for at least 24 hours before making another change.
5. Use per-session `work_mem` for heavy analytical queries rather than raising the global default.

The goal is not to maximize these values but to find the sweet spot where your queries run efficiently without putting memory pressure on the instance. Start conservative, measure, and adjust incrementally. Your Cloud SQL PostgreSQL instance will thank you with faster queries and fewer disk spills.
