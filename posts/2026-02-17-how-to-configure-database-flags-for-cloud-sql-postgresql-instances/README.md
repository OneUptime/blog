# How to Configure Database Flags for Cloud SQL PostgreSQL Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, PostgreSQL, Database Flags, Performance Tuning

Description: A comprehensive guide to configuring PostgreSQL database flags in Cloud SQL for performance tuning, logging, and workload optimization.

---

Tuning PostgreSQL on Cloud SQL means working with database flags. These are the equivalent of `postgresql.conf` settings, but managed through the Cloud SQL API. You cannot SSH into a Cloud SQL instance and edit config files, so flags are your main mechanism for adjusting instance-level server parameters. This guide covers the flags that matter most and how to configure them for different workloads.

## Setting Database Flags

### Using gcloud CLI

```bash
# Set database flags for a PostgreSQL Cloud SQL instance

gcloud sql instances patch my-pg-instance \
    --database-flags=max_connections=200,work_mem=65536,log_min_duration_statement=1000
```

Like MySQL, this replaces all existing flags. Always include your complete flag list.

Check current flags:

```bash
# View currently configured flags
gcloud sql instances describe my-pg-instance \
    --format="json(settings.databaseFlags)"
```

### Using Terraform

```hcl
# Terraform configuration for PostgreSQL database flags
resource "google_sql_database_instance" "postgres" {
  name             = "my-pg-instance"
  database_version = "POSTGRES_15"
  region           = "us-central1"

  settings {
    tier = "db-custom-4-16384"

    database_flags {
      name  = "max_connections"
      value = "200"
    }

    database_flags {
      name  = "work_mem"
      value = "65536"  # 64 MB in KB
    }

    database_flags {
      name  = "log_min_duration_statement"
      value = "1000"  # Log queries taking longer than 1 second
    }
  }
}
```

## Memory-Related Flags

### shared_buffers

Cloud SQL manages `shared_buffers` automatically based on your machine type. You can set this flag if you need to, but Cloud SQL constrains it to a supported range based on the instance's RAM, so the automatic value is usually the right starting point.

### work_mem

Controls memory allocated per-operation for sorting and hash tables. Each query can use multiple `work_mem` allocations:

```bash
# Set work_mem to 64 MB
# Be careful: total memory = work_mem x active_operations x connections
gcloud sql instances patch my-pg-instance \
    --database-flags=work_mem=65536
```

The default is 4 MB, which causes many sort operations to spill to disk. For analytical queries, increasing this to 64-256 MB can dramatically improve performance. But be cautious - if you have 200 connections and each runs a complex query with multiple sorts, memory can balloon quickly.

### maintenance_work_mem

Memory for maintenance operations like VACUUM, CREATE INDEX, and ALTER TABLE:

```bash
# Set maintenance_work_mem to 512 MB
# This only affects maintenance operations, not regular queries
gcloud sql instances patch my-pg-instance \
    --database-flags=maintenance_work_mem=524288
```

This is safe to set high because only a few maintenance operations run simultaneously.

### effective_cache_size

Tells the query planner how much memory is available for disk caching (shared buffers plus OS cache):

```bash
# Set to about 60-70% of total instance memory
# For a 16 GB instance, use 10 GB
gcloud sql instances patch my-pg-instance \
    --database-flags=effective_cache_size=10485760
```

This does not allocate memory - it just helps the planner make better decisions about index usage versus sequential scans.

## Query Planning Flags

### random_page_cost

Controls how expensive the planner considers random I/O versus sequential I/O:

```bash
# Set to 1.1 for SSD-backed workloads after testing
gcloud sql instances patch my-pg-instance \
    --database-flags=random_page_cost=1.1
```

For SSD-backed workloads, the default value of 4.0 can be too conservative. Setting it to 1.1 encourages the planner to use indexes more aggressively, which can be appropriate for SSDs.

### effective_io_concurrency

Tells PostgreSQL how many concurrent I/O requests the storage can handle:

```bash
# Set higher for SSD storage (default is 1)
gcloud sql instances patch my-pg-instance \
    --database-flags=effective_io_concurrency=200
```

### default_statistics_target

Controls the detail level of statistics collected by ANALYZE:

```bash
# Increase for better query plans on large tables (default is 100)
gcloud sql instances patch my-pg-instance \
    --database-flags=default_statistics_target=200
```

Higher values mean more accurate statistics but slower ANALYZE runs. For tables with skewed data distributions, this is worth increasing.

## Logging Flags

### log_min_duration_statement

The PostgreSQL equivalent of MySQL's slow query log:

```bash
# Log all queries taking longer than 500 milliseconds
gcloud sql instances patch my-pg-instance \
    --database-flags=log_min_duration_statement=500
```

Set this to capture slow queries without flooding your logs. Start at 1000ms (1 second) and lower it as you fix the worst offenders.

### log_statement

Controls which SQL statements are logged:

```bash
# Log DDL statements (CREATE, ALTER, DROP)
# Options: none, ddl, mod (DDL + INSERT/UPDATE/DELETE), all
gcloud sql instances patch my-pg-instance \
    --database-flags=log_statement=ddl
```

For production, `ddl` is usually the right choice. It logs schema changes without the overhead of logging every query. Use `all` only for debugging, and only temporarily.

### log_lock_waits

Log when queries wait too long for locks:

```bash
# Log lock waits longer than 1 second (deadlock_timeout)
gcloud sql instances patch my-pg-instance \
    --database-flags=log_lock_waits=on
```

### log_checkpoints

```bash
# Log checkpoint information for I/O troubleshooting
gcloud sql instances patch my-pg-instance \
    --database-flags=log_checkpoints=on
```

## pg_stat_statements

This extension is essential for query performance analysis. Cloud SQL supports `pg_stat_statements`, but it does not expose `shared_preload_libraries` as a database flag. Create the extension in your database:

```sql
-- Create the pg_stat_statements extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Query the top 10 slowest queries by total time
SELECT
    calls,
    round(total_exec_time::numeric, 2) AS total_time_ms,
    round(mean_exec_time::numeric, 2) AS avg_time_ms,
    round((100 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 2) AS percent_total,
    query
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

This is one of the first things I enable on any new PostgreSQL instance. It shows you exactly where your database spends its time.

## Connection Flags

### max_connections

```bash
# Set max connections (default varies by machine type)
gcloud sql instances patch my-pg-instance \
    --database-flags=max_connections=200
```

PostgreSQL handles connections differently from MySQL. Each connection is a separate process, consuming more memory. If you need more than 200-300 connections, use PgBouncer for connection pooling rather than raising this number.

### idle_in_transaction_session_timeout

Kill idle transactions that hold locks:

```bash
# Terminate transactions idle for more than 5 minutes
gcloud sql instances patch my-pg-instance \
    --database-flags=idle_in_transaction_session_timeout=300000
```

Idle transactions are a common cause of lock contention and table bloat (because VACUUM cannot clean rows they might still need).

### statement_timeout

Set a maximum query execution time:

```sql
-- Kill queries running longer than 30 seconds for this database
ALTER DATABASE my_database SET statement_timeout = '30s';
```

This prevents runaway queries from consuming resources indefinitely. Applications can override this per-session if they need longer timeouts for specific operations. Cloud SQL does not expose `statement_timeout` as a database flag, so configure it at the database, role, or session level.

## Autovacuum Flags

Autovacuum is critical for PostgreSQL performance. Tune it for your workload:

```bash
# Configure autovacuum for a high-transaction workload
gcloud sql instances patch my-pg-instance \
    --database-flags=\
autovacuum_vacuum_cost_limit=2000,\
autovacuum_vacuum_scale_factor=0.05,\
autovacuum_analyze_scale_factor=0.02,\
autovacuum_max_workers=4
```

What these do:

- `autovacuum_vacuum_cost_limit=2000` - Lets autovacuum do more work before sleeping
- `autovacuum_vacuum_scale_factor=0.05` - Trigger vacuum when 5% of rows are dead (default 20%)
- `autovacuum_analyze_scale_factor=0.02` - Trigger analyze when 2% of rows change (default 10%)
- `autovacuum_max_workers=4` - Run up to 4 autovacuum workers in parallel

For tables with millions of rows, the default scale factors (20% for vacuum, 10% for analyze) mean autovacuum waits too long before running.

## Parallelism Flags

Enable parallel query execution for analytical workloads:

```bash
# Configure parallel query settings
gcloud sql instances patch my-pg-instance \
    --database-flags=\
max_parallel_workers_per_gather=4,\
max_parallel_workers=8,\
max_worker_processes=12
```

These enable PostgreSQL to use multiple CPU cores for a single query, which can dramatically speed up large sequential scans, aggregations, and joins.

## Recommended Configuration for Production

For a `db-custom-4-16384` (4 vCPU, 16 GB) production instance:

```bash
# Production-ready PostgreSQL flag configuration
gcloud sql instances patch my-pg-instance \
    --database-flags=\
max_connections=200,\
work_mem=65536,\
maintenance_work_mem=524288,\
effective_cache_size=10485760,\
random_page_cost=1.1,\
effective_io_concurrency=200,\
log_min_duration_statement=1000,\
log_checkpoints=on,\
log_lock_waits=on,\
idle_in_transaction_session_timeout=300000,\
autovacuum_vacuum_scale_factor=0.05,\
autovacuum_analyze_scale_factor=0.02
```

## Verifying Flag Values

Check that flags are applied:

```sql
-- Verify current PostgreSQL settings
SHOW max_connections;
SHOW work_mem;
SHOW random_page_cost;

-- Or query all settings at once
SELECT name, setting, unit, context
FROM pg_settings
WHERE name IN ('max_connections', 'work_mem', 'random_page_cost', 'effective_cache_size');
```

## Summary

PostgreSQL database flags in Cloud SQL give you meaningful control over performance without managing the underlying infrastructure. Start with the essentials - work_mem, random_page_cost, pg_stat_statements, and slow query logging - and iterate based on real monitoring data. Remember that flag changes replace all existing flags, so maintain a complete list somewhere (Terraform is ideal for this). Test changes in staging first, especially flags that require a restart.
