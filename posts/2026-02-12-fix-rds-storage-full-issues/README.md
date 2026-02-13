# How to Fix RDS Storage Full Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, RDS, Database, Storage, Troubleshooting

Description: Fix RDS storage full problems by identifying space consumers, cleaning up data, enabling auto-scaling storage, and setting up proper monitoring alerts.

---

Your RDS instance has run out of storage. The database stops accepting writes, your application throws errors, and everything grinds to a halt. Depending on the database engine, you might see errors like:

```
ERROR 1114 (HY000): The table 'my_table' is full
```

or

```
FATAL: could not write to file "base/16384/12345": No space left on device
```

This is a serious issue because a full disk can crash your database or put it into a read-only state. Let's fix it immediately and then set up prevention.

## Emergency: Check Current Storage

```bash
# Check allocated and used storage
aws rds describe-db-instances \
  --db-instance-identifier my-database \
  --query 'DBInstances[0].{AllocatedStorage:AllocatedStorage,StorageType:StorageType,Engine:Engine,Status:DBInstanceStatus}'
```

Check CloudWatch for the actual free space:

```bash
# Get free storage space (in bytes)
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name FreeStorageSpace \
  --dimensions Name=DBInstanceIdentifier,Value=my-database \
  --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics Average \
  --query 'Datapoints | sort_by(@, &Timestamp) | [-1].{FreeBytes:Average}'
```

## Immediate Fix: Increase Storage

The fastest way to get out of trouble is to increase the allocated storage:

```bash
# Increase storage (this is an online operation for most engine types)
aws rds modify-db-instance \
  --db-instance-identifier my-database \
  --allocated-storage 200 \
  --apply-immediately
```

Important notes:
- You can only increase storage, never decrease it
- The modification takes effect immediately but may take time to complete
- You can't modify storage again for 6 hours after an increase
- There's a minimum increase of 10% of the current allocation

Check the modification progress:

```bash
# Monitor the modification
aws rds describe-db-instances \
  --db-instance-identifier my-database \
  --query 'DBInstances[0].{Status:DBInstanceStatus,PendingModified:PendingModifiedValues}'
```

## Enable Storage Auto Scaling

Don't let this happen again. Enable auto-scaling so RDS automatically increases storage when it's running low:

```bash
# Enable storage auto-scaling with a max of 500 GB
aws rds modify-db-instance \
  --db-instance-identifier my-database \
  --max-allocated-storage 500 \
  --apply-immediately
```

RDS will automatically scale storage when:
- Free space is less than 10% of allocated storage
- Low storage condition lasts at least 5 minutes
- At least 6 hours have passed since the last storage modification

```bash
# Verify auto-scaling is enabled
aws rds describe-db-instances \
  --db-instance-identifier my-database \
  --query 'DBInstances[0].MaxAllocatedStorage'
```

If the output is `null`, auto-scaling isn't enabled. If it shows a number, that's your max limit.

## Find What's Eating Your Storage

More storage buys you time, but you should investigate what's consuming it.

### For MySQL/MariaDB

Connect to the database and check table sizes:

```sql
-- Find the largest tables
SELECT
  table_schema AS 'Database',
  table_name AS 'Table',
  ROUND(data_length / 1024 / 1024, 2) AS 'Data (MB)',
  ROUND(index_length / 1024 / 1024, 2) AS 'Index (MB)',
  ROUND(data_free / 1024 / 1024, 2) AS 'Free (MB)',
  ROUND((data_length + index_length) / 1024 / 1024, 2) AS 'Total (MB)'
FROM information_schema.tables
ORDER BY (data_length + index_length) DESC
LIMIT 20;

-- Check binary log usage
SHOW BINARY LOGS;

-- Check general log and slow query log sizes
SHOW VARIABLES LIKE '%log%';
```

### For PostgreSQL

```sql
-- Find the largest tables
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname || '.' || tablename)) AS data_size,
  pg_size_pretty(pg_indexes_size(schemaname || '.' || tablename::regclass)) AS index_size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
LIMIT 20;

-- Check for bloated tables (dead tuples)
SELECT
  relname,
  n_live_tup,
  n_dead_tup,
  ROUND(n_dead_tup::float / GREATEST(n_live_tup, 1) * 100, 1) AS dead_pct
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 20;

-- Check WAL segment usage
SELECT pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0')) AS wal_size;
```

## Common Storage Consumers

### 1. Transaction Logs / Binary Logs

MySQL binary logs and PostgreSQL WAL files can consume significant space.

For MySQL, reduce binary log retention:

```sql
-- Check current retention (in hours)
CALL mysql.rds_show_configuration;

-- Set binary log retention to 24 hours (default is NULL = as long as possible)
CALL mysql.rds_set_configuration('binlog retention hours', 24);
```

For PostgreSQL, check replication slots that might prevent WAL cleanup:

```sql
-- Check replication slots (inactive ones can block WAL cleanup)
SELECT
  slot_name,
  active,
  pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained_wal
FROM pg_replication_slots;

-- Drop unused replication slots
SELECT pg_drop_replication_slot('unused_slot_name');
```

### 2. Temporary Tables and Sorts

Large queries can create temporary files that eat disk space:

```sql
-- MySQL: Check tmp table usage
SHOW GLOBAL STATUS LIKE 'Created_tmp%';

-- PostgreSQL: Check temp file usage
SELECT datname, temp_files, pg_size_pretty(temp_bytes) AS temp_size
FROM pg_stat_database
WHERE datname = current_database();
```

### 3. Unused Indexes

Indexes consume storage. Drop ones that aren't being used:

```sql
-- PostgreSQL: Find unused indexes
SELECT
  schemaname || '.' || relname AS table,
  indexrelname AS index,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size,
  idx_scan AS scans
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;
```

### 4. Table Bloat

Frequent updates and deletes cause table bloat (especially in PostgreSQL):

```sql
-- PostgreSQL: Reclaim space with VACUUM
VACUUM FULL my_large_table;

-- MySQL: Optimize table (reclaims InnoDB space)
OPTIMIZE TABLE my_large_table;
```

Note: `VACUUM FULL` and `OPTIMIZE TABLE` lock the table during operation. Run them during maintenance windows.

### 5. Snapshots and Backups Taking Space

RDS automated backups don't consume instance storage, but manual snapshots and certain log types do. Clean up old snapshots:

```bash
# List manual snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier my-database \
  --snapshot-type manual \
  --query 'DBSnapshots[*].{Id:DBSnapshotIdentifier,Size:AllocatedStorage,Created:SnapshotCreateTime}' \
  --output table

# Delete old manual snapshots
aws rds delete-db-snapshot --db-snapshot-identifier old-snapshot-name
```

## Set Up Storage Monitoring

Don't wait for the disk to fill up. Set up alerts:

```bash
# Create CloudWatch alarm for low free storage (5 GB threshold)
aws cloudwatch put-metric-alarm \
  --alarm-name "rds-storage-low" \
  --metric-name FreeStorageSpace \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 5368709120 \
  --comparison-operator LessThanThreshold \
  --dimensions Name=DBInstanceIdentifier,Value=my-database \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:alerts
```

For comprehensive database monitoring including storage trends and capacity planning, [OneUptime](https://oneuptime.com/blog/post/2026-02-06-aws-cloudwatch-logs-exporter-opentelemetry-collector/view) can help you visualize storage consumption over time and predict when you'll need more space.

## Summary

1. **Immediate fix**: Increase allocated storage
2. **Prevention**: Enable storage auto-scaling
3. **Investigation**: Find what's consuming space (tables, logs, bloat)
4. **Maintenance**: Regular cleanup of logs, bloat, and unused indexes
5. **Monitoring**: Set up alerts well before you hit the limit

Running out of disk space is one of the most preventable database issues. Auto-scaling plus monitoring gives you a safety net that catches the problem before it impacts your application.
