# How to Tune Performance Parameters in Azure Database for PostgreSQL Flexible Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, PostgreSQL, Performance Tuning, Server Parameters, Flexible Server, Database Optimization, Configuration

Description: A practical guide to tuning the most important performance parameters in Azure Database for PostgreSQL Flexible Server for better query performance and throughput.

---

Azure Database for PostgreSQL Flexible Server ships with default parameter values that are reasonable for general-purpose workloads. But "reasonable" and "optimal for your specific workload" are two very different things. If you have not touched the server parameters since provisioning, there is a good chance your database could be performing significantly better with some targeted adjustments.

This post covers the parameters that have the biggest impact on performance, how to diagnose when tuning is needed, and practical guidance on what values to use.

## How Parameters Work in Flexible Server

PostgreSQL has hundreds of configuration parameters. In Flexible Server, you can modify most of them through the Azure CLI or portal. Parameters are either:

- **Dynamic**: Take effect immediately, no restart needed.
- **Static**: Require a server restart to take effect.

```bash
# View a parameter's current value
az postgres flexible-server parameter show \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name shared_buffers

# Set a parameter
az postgres flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name work_mem \
  --value 65536
```

## shared_buffers

This is the most important performance parameter. It controls how much memory PostgreSQL uses for caching data pages in memory.

**Default in Azure**: Typically set to 25% of available RAM, which is the PostgreSQL recommendation.

**When to adjust**: If you have a workload that is heavily read-focused with a large working set, you might benefit from increasing it to 40% of RAM. For write-heavy workloads, the default 25% is usually fine.

```bash
# For a server with 32 GB RAM, set shared_buffers to approximately 8 GB
# Value is in 8KB pages: 8 GB = 8 * 1024 * 1024 / 8 = 1048576 pages
az postgres flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name shared_buffers \
  --value 1048576
```

Check buffer cache hit ratio to see if your current setting is adequate:

```sql
-- Check the buffer cache hit ratio
-- Aim for 99%+ in production
SELECT
    sum(heap_blks_read) AS heap_read,
    sum(heap_blks_hit) AS heap_hit,
    round(sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read))::numeric * 100, 2) AS hit_ratio
FROM pg_statio_user_tables;
```

If the hit ratio is below 99%, your working set might be larger than your buffer cache.

## work_mem

Controls how much memory each operation (sort, hash join, hash aggregate) can use before spilling to disk. This is per-operation, not per-connection, and a single query can use multiple work_mem allocations.

**Default**: Usually 4 MB.

**When to adjust**: When queries involving sorts, hash joins, or aggregations are spilling to disk (you will see "Sort Method: external merge" in EXPLAIN output).

```bash
# Increase work_mem to 64 MB
az postgres flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name work_mem \
  --value 65536
```

Be cautious: if you have 200 connections and each runs a query with 3 sort operations, that is 200 * 3 * 64 MB = 38 GB of potential memory usage. Size this based on your connection count and query patterns.

Check for disk-based sorts:

```sql
-- Find queries that spill sorts to disk
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM large_table ORDER BY some_column LIMIT 100;
-- Look for "Sort Method: external merge Disk:" in the output
```

## effective_cache_size

This does not allocate any memory - it tells the query planner how much memory is available for caching (shared_buffers + OS page cache). A higher value makes the planner more likely to choose index scans over sequential scans.

**Default**: Usually 50-75% of total RAM.

**Recommendation**: Set to about 75% of total RAM.

```bash
# For a 32 GB server, set to ~24 GB
# Value is in 8KB pages: 24 GB = 24 * 1024 * 1024 / 8 = 3145728 pages
az postgres flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name effective_cache_size \
  --value 3145728
```

## maintenance_work_mem

Memory used for maintenance operations like VACUUM, CREATE INDEX, and ALTER TABLE ADD FOREIGN KEY. These operations run infrequently but benefit significantly from more memory.

**Default**: Usually 64 MB.

**Recommendation**: Set to 512 MB - 2 GB depending on your server RAM. Since maintenance operations typically run one at a time, this is safe to increase.

```bash
# Set to 1 GB for faster VACUUM and index creation
az postgres flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name maintenance_work_mem \
  --value 1048576
```

## max_connections

Controls the maximum number of concurrent connections.

**Default**: Varies by SKU.

**When to adjust**: When your application hits "too many connections" errors. But before increasing this, consider using the built-in PgBouncer connection pooler - it is almost always a better solution than increasing max_connections.

```bash
# Check current connection usage vs limit
az postgres flexible-server parameter show \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name max_connections
```

```sql
-- Check active connections
SELECT count(*) AS active_connections FROM pg_stat_activity
WHERE state != 'idle';

-- Check connection usage by database
SELECT datname, count(*) FROM pg_stat_activity
GROUP BY datname ORDER BY count DESC;
```

## effective_io_concurrency

Tells PostgreSQL how many concurrent disk I/O operations the storage system can handle. Higher values allow PostgreSQL to issue more parallel I/O requests.

**Default**: 1 (conservative, designed for spinning disks).

**Recommendation**: For Azure's SSD-based storage, set to 200.

```bash
# Set for SSD storage
az postgres flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name effective_io_concurrency \
  --value 200
```

## random_page_cost

The planner's estimate of the cost of a random disk page fetch relative to a sequential fetch. Lower values make the planner prefer index scans.

**Default**: 4.0 (assumes spinning disks where random I/O is 4x slower than sequential).

**Recommendation**: For SSD storage, set to 1.1-1.5.

```bash
# Set for SSD storage where random I/O is nearly as fast as sequential
az postgres flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name random_page_cost \
  --value 1.1
```

This change alone can dramatically improve query plans for workloads with many index lookups.

## checkpoint_completion_target

Controls how quickly checkpoints are spread over the checkpoint interval. A higher value spreads the I/O more evenly.

**Default**: 0.9 (which is good).

**Recommendation**: Keep at 0.9. If you experience I/O spikes during checkpoints, this is usually already at the right value.

## wal_buffers

Memory used for WAL (write-ahead log) buffers.

**Default**: Auto-calculated as 1/32 of shared_buffers (usually sufficient).

**When to adjust**: If you have very high write throughput and see WAL-related waits.

```bash
# Set to 64 MB for high-write workloads
az postgres flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name wal_buffers \
  --value 8192
```

## max_parallel_workers_per_gather

Controls how many parallel workers a single query can use. PostgreSQL can parallelize sequential scans, hash joins, and aggregations.

**Default**: Usually 2.

**Recommendation**: For OLAP or reporting workloads, increase to match your vCPU count divided by 2.

```bash
# Allow up to 4 parallel workers per query
az postgres flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name max_parallel_workers_per_gather \
  --value 4

# Also increase the total max parallel workers
az postgres flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name max_parallel_workers \
  --value 8
```

## autovacuum Tuning

PostgreSQL's autovacuum process cleans up dead tuples and updates statistics. Poorly tuned autovacuum can lead to table bloat and degraded query performance.

```bash
# Run autovacuum more frequently
az postgres flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name autovacuum_vacuum_scale_factor \
  --value 0.05

# Lower the threshold for triggering autovacuum
az postgres flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name autovacuum_vacuum_threshold \
  --value 50

# Give autovacuum more resources
az postgres flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name autovacuum_work_mem \
  --value 524288

# Allow more autovacuum workers for tables with heavy write load
az postgres flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name autovacuum_max_workers \
  --value 5
```

Check if autovacuum is keeping up:

```sql
-- Check for tables with excessive dead tuples
SELECT
    schemaname || '.' || relname AS table_name,
    n_live_tup,
    n_dead_tup,
    round(n_dead_tup::numeric / NULLIF(n_live_tup, 0) * 100, 2) AS dead_pct,
    last_autovacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC
LIMIT 20;
```

## A Systematic Approach to Tuning

1. **Start with monitoring**: Enable pg_stat_statements and Query Store before making changes.
2. **Establish baselines**: Measure current performance with your actual workload.
3. **Prioritize by impact**: Start with shared_buffers, work_mem, random_page_cost, and effective_io_concurrency - these have the biggest impact.
4. **Change one parameter at a time**: Otherwise you will not know what helped.
5. **Measure after each change**: Compare against your baseline.
6. **Document changes**: Keep a log of what you changed and why.

## Summary

Performance tuning for Azure Database for PostgreSQL Flexible Server is about making targeted adjustments based on your workload characteristics. The SSD-focused parameters (random_page_cost, effective_io_concurrency) are safe quick wins. Memory parameters (shared_buffers, work_mem, maintenance_work_mem) require understanding your workload's memory needs. Autovacuum tuning prevents table bloat from degrading performance over time. Start with the biggest levers, measure the impact, and iterate. There is no universal "best" configuration - the right values depend on your specific workload.
