# How to Troubleshoot RDS Storage Full Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, RDS, Troubleshooting, Storage, Database

Description: Diagnose and resolve RDS storage full problems including identifying space consumers, cleaning up data, and preventing future storage exhaustion.

---

When an RDS instance runs out of storage, bad things happen quickly. The database goes into a read-only state, writes fail, and your application starts throwing errors. Depending on the engine, you might not even be able to connect to investigate the problem.

This is one of those issues where prevention is far better than cure. But if you're reading this, there's a good chance you're already dealing with it. Let's fix the immediate problem first, then set up safeguards so it doesn't happen again.

## Emergency Response: Getting Writes Working Again

If your database is currently out of space, the fastest fix is to increase the allocated storage:

```bash
# Increase storage immediately (no downtime required)
aws rds modify-db-instance \
  --db-instance-identifier my-database \
  --allocated-storage 200 \
  --apply-immediately
```

Storage increases happen in the background without downtime, but they take time - anywhere from a few minutes to a few hours depending on the amount of increase and the storage type.

Important: After a storage modification, you can't modify storage again for 6 hours. So increase it enough to give yourself breathing room.

If you can't wait for the storage increase, you might be able to free up space immediately by connecting to the database and dropping temporary or unnecessary data. More on that below.

## Identifying What's Consuming Space

### PostgreSQL

Connect to your RDS instance and run these queries to understand where the space is going:

```sql
-- Check total database size
SELECT pg_size_pretty(pg_database_size(current_database())) AS database_size;

-- Find the largest tables
SELECT schemaname, tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname || '.' || tablename)) AS table_size,
  pg_size_pretty(pg_indexes_size(schemaname || '.' || tablename)) AS index_size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
LIMIT 20;

-- Check for bloated tables (dead rows taking up space)
SELECT relname,
  n_live_tup,
  n_dead_tup,
  ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 1) AS dead_pct,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 10000
ORDER BY n_dead_tup DESC
LIMIT 20;

-- Check WAL (Write-Ahead Log) space usage
SELECT pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0')) AS wal_size;

-- Check for replication slots that might be holding WAL
SELECT slot_name, active,
  pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained_wal
FROM pg_replication_slots;
```

### MySQL

```sql
-- Check database sizes
SELECT table_schema AS 'Database',
  ROUND(SUM(data_length + index_length) / 1024 / 1024 / 1024, 2) AS 'Size (GB)',
  ROUND(SUM(data_free) / 1024 / 1024 / 1024, 2) AS 'Free Space (GB)'
FROM information_schema.tables
GROUP BY table_schema
ORDER BY SUM(data_length + index_length) DESC;

-- Find the largest tables
SELECT table_schema, table_name,
  ROUND((data_length + index_length) / 1024 / 1024, 2) AS 'Total (MB)',
  ROUND(data_length / 1024 / 1024, 2) AS 'Data (MB)',
  ROUND(index_length / 1024 / 1024, 2) AS 'Index (MB)',
  ROUND(data_free / 1024 / 1024, 2) AS 'Free (MB)',
  table_rows AS 'Rows'
FROM information_schema.tables
WHERE table_schema NOT IN ('mysql', 'information_schema', 'performance_schema', 'sys')
ORDER BY (data_length + index_length) DESC
LIMIT 20;

-- Check binary log space (often a major consumer)
SHOW BINARY LOGS;

-- Check temporary table usage
SHOW GLOBAL STATUS LIKE 'Created_tmp_disk_tables';
```

## Common Space Consumers and How to Fix Them

### 1. Table Bloat (PostgreSQL)

PostgreSQL's MVCC architecture means that deleted or updated rows aren't immediately removed - they become "dead tuples." Autovacuum normally cleans these up, but if it falls behind, tables can bloat significantly.

```sql
-- Run VACUUM on bloated tables to reclaim space
VACUUM VERBOSE my_large_table;

-- For severe bloat, VACUUM FULL rewrites the entire table
-- WARNING: This locks the table for the duration
VACUUM FULL my_large_table;

-- Check autovacuum settings
SHOW autovacuum;
SHOW autovacuum_vacuum_threshold;
SHOW autovacuum_vacuum_scale_factor;
```

If autovacuum isn't keeping up, tune it:

```bash
# Make autovacuum more aggressive for specific tables
aws rds modify-db-parameter-group \
  --db-parameter-group-name my-param-group \
  --parameters \
    "ParameterName=autovacuum_vacuum_scale_factor,ParameterValue=0.05,ApplyMethod=immediate" \
    "ParameterName=autovacuum_analyze_scale_factor,ParameterValue=0.025,ApplyMethod=immediate"
```

### 2. Orphaned Replication Slots (PostgreSQL)

A replication slot that's no longer being consumed holds onto WAL files indefinitely. This is one of the sneakiest causes of storage exhaustion.

```sql
-- Find inactive replication slots holding WAL
SELECT slot_name, active,
  pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained_wal
FROM pg_replication_slots
WHERE NOT active;

-- Drop an orphaned slot to release WAL space
SELECT pg_drop_replication_slot('abandoned_slot_name');
```

### 3. Binary Logs (MySQL)

MySQL binary logs can accumulate and consume significant space, especially if the retention period is long:

```sql
-- Check binary log retention
CALL mysql.rds_show_configuration;

-- Reduce binary log retention (hours)
CALL mysql.rds_set_configuration('binlog retention hours', 24);

-- Manually purge old binary logs (be careful with replicas)
-- This happens automatically with the retention setting
```

### 4. Large or Unused Indexes

Indexes take up space. Sometimes tables accumulate indexes that are no longer used by any queries.

```sql
-- PostgreSQL: find unused indexes
SELECT schemaname, tablename, indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  idx_scan AS times_used
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelid NOT IN (
    SELECT indexrelid FROM pg_constraint WHERE contype IN ('p', 'u')
  )
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;

-- Drop unused indexes to reclaim space
DROP INDEX CONCURRENTLY idx_unused_index;
```

### 5. Audit or Log Tables

Applications often write to audit, event, or log tables that grow without bound. Identify and clean them up:

```sql
-- Find tables that look like logs or audit trails
SELECT tablename,
  pg_size_pretty(pg_total_relation_size(tablename::regclass)) AS size,
  n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE tablename LIKE '%log%'
   OR tablename LIKE '%audit%'
   OR tablename LIKE '%event%'
   OR tablename LIKE '%history%'
ORDER BY pg_total_relation_size(tablename::regclass) DESC;

-- Delete old log entries (adjust the date and table name)
DELETE FROM application_logs WHERE created_at < NOW() - INTERVAL '90 days';

-- For very large deletes, do it in batches to avoid lock contention
DELETE FROM application_logs
WHERE id IN (
  SELECT id FROM application_logs
  WHERE created_at < NOW() - INTERVAL '90 days'
  LIMIT 10000
);
```

### 6. Temporary Tables and Failed Operations

Failed ALTER TABLE operations or large temporary tables can leave behind space that isn't reclaimed:

```sql
-- MySQL: Optimize tables to reclaim space from failed operations
OPTIMIZE TABLE my_table;

-- PostgreSQL: Reindex if indexes are bloated
REINDEX TABLE CONCURRENTLY my_table;
```

## Monitoring Storage to Prevent Recurrence

### Enable Storage Auto Scaling

The single best thing you can do to prevent storage-full issues:

```bash
# Enable storage auto scaling with a reasonable maximum
aws rds modify-db-instance \
  --db-instance-identifier my-database \
  --max-allocated-storage 1000 \
  --apply-immediately
```

See our detailed guide on [enabling RDS storage auto scaling](https://oneuptime.com/blog/post/enable-rds-storage-auto-scaling/view) for more.

### Set Up Storage Alarms

Create alarms that alert you well before you run out of space:

```bash
# Alert at 20% free (early warning)
aws cloudwatch put-metric-alarm \
  --alarm-name "rds-mydb-storage-warning" \
  --metric-name FreeStorageSpace \
  --namespace AWS/RDS \
  --statistic Average \
  --period 3600 \
  --evaluation-periods 1 \
  --threshold 42949672960 \
  --comparison-operator LessThanThreshold \
  --dimensions Name=DBInstanceIdentifier,Value=my-database \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:db-warnings

# Alert at 10% free (critical)
aws cloudwatch put-metric-alarm \
  --alarm-name "rds-mydb-storage-critical" \
  --metric-name FreeStorageSpace \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 21474836480 \
  --comparison-operator LessThanThreshold \
  --dimensions Name=DBInstanceIdentifier,Value=my-database \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:db-critical
```

### Implement Data Retention Policies

Don't let tables grow forever. Set up automated cleanup:

```sql
-- Create a partition strategy for time-series data (PostgreSQL)
CREATE TABLE application_logs (
  id BIGSERIAL,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE application_logs_2026_01
  PARTITION OF application_logs
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE application_logs_2026_02
  PARTITION OF application_logs
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- To clean up old data, just drop the partition (instant, no vacuum needed)
DROP TABLE application_logs_2025_11;
```

Storage issues are preventable. Enable auto scaling, set up [CloudWatch alarms](https://oneuptime.com/blog/post/set-up-cloudwatch-alarms-for-rds-metrics/view), implement retention policies, and keep an eye on your biggest tables. A few minutes of setup saves hours of emergency firefighting.
