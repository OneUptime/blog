# How to Monitor MySQL Disk Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Monitoring, Storage, Disk, InnoDB

Description: Learn how to monitor MySQL disk usage across data files, binary logs, temporary files, and undo logs to prevent disk exhaustion and plan capacity.

---

## Why Disk Monitoring Is Critical for MySQL

MySQL disk exhaustion is one of the most severe failure modes - when the disk fills, MySQL cannot write to binary logs, undo logs, or data files, causing all writes to fail. Proactive disk monitoring with alerts at 70-80% capacity prevents this scenario.

## Monitoring Data Directory Size

Check the total size of the MySQL data directory:

```bash
du -sh /var/lib/mysql/
du -sh /var/lib/mysql/* | sort -rh | head -20
```

This shows which databases and tablespace files are consuming the most space.

## Per-Database Storage from SQL

Query table storage sizes per database:

```sql
SELECT
  table_schema AS database_name,
  ROUND(SUM(data_length + index_length) / 1073741824, 2) AS total_gb,
  ROUND(SUM(data_length) / 1073741824, 2) AS data_gb,
  ROUND(SUM(index_length) / 1073741824, 2) AS index_gb,
  ROUND(SUM(data_free) / 1073741824, 2) AS free_gb
FROM information_schema.TABLES
WHERE table_schema NOT IN ('mysql', 'information_schema', 'performance_schema', 'sys')
GROUP BY table_schema
ORDER BY total_gb DESC;
```

## Top Tables by Size

Find the largest tables consuming disk:

```sql
SELECT
  table_schema,
  table_name,
  ROUND((data_length + index_length) / 1073741824, 3) AS size_gb,
  ROUND(data_free / 1073741824, 3) AS free_gb,
  table_rows
FROM information_schema.TABLES
WHERE table_schema NOT IN ('mysql', 'information_schema', 'performance_schema', 'sys')
ORDER BY (data_length + index_length) DESC
LIMIT 20;
```

## Binary Log Disk Usage

Binary logs can accumulate rapidly on write-heavy servers:

```sql
SHOW BINARY LOGS;
```

Check total binary log size:

```bash
du -sh /var/lib/mysql/binlog.*
```

Ensure `binlog_expire_logs_seconds` is set to automatically remove old logs:

```sql
SHOW VARIABLES LIKE 'binlog_expire_logs_seconds';
```

## Undo Log and Temporary Tablespace

InnoDB undo logs grow when long-running transactions are open:

```sql
SELECT NAME, SPACE_TYPE,
       ROUND(FILE_SIZE / 1073741824, 2) AS size_gb,
       ROUND(ALLOCATED_SIZE / 1073741824, 2) AS allocated_gb
FROM information_schema.INNODB_TABLESPACES
WHERE SPACE_TYPE = 'Undo';
```

The temporary tablespace (`ibtmp1`) can also grow under heavy temp table usage:

```bash
ls -lh /var/lib/mysql/ibtmp1
```

## Operating System Level Monitoring

Set up OS-level disk monitoring with an alert at 80%:

```bash
# Add to cron for email alert
df -h /var/lib/mysql | awk 'NR==2{gsub(/%/,""); if($5 > 80) print "WARNING: MySQL disk at " $5 "%"}'
```

For Prometheus monitoring, use `node_filesystem_avail_bytes` and `node_filesystem_size_bytes`:

```yaml
- alert: MySQLDiskAlmostFull
  expr: >
    node_filesystem_avail_bytes{mountpoint="/var/lib/mysql"} /
    node_filesystem_size_bytes{mountpoint="/var/lib/mysql"} < 0.20
  for: 5m
  annotations:
    summary: MySQL data disk is more than 80% full
```

## Growth Trend Analysis

Track database size over time to project when disk will fill. Record the output of the per-database query daily in a metrics table:

```sql
CREATE TABLE disk_usage_history (
  recorded_at DATE NOT NULL,
  database_name VARCHAR(100) NOT NULL,
  total_gb DECIMAL(10,3) NOT NULL,
  PRIMARY KEY (recorded_at, database_name)
) ENGINE=InnoDB;

INSERT INTO disk_usage_history (recorded_at, database_name, total_gb)
SELECT CURDATE(), table_schema,
       ROUND(SUM(data_length + index_length) / 1073741824, 3)
FROM information_schema.TABLES
WHERE table_schema NOT IN ('mysql', 'information_schema', 'performance_schema', 'sys')
GROUP BY table_schema;
```

## Summary

Monitor MySQL disk usage by querying `information_schema.TABLES` for per-table and per-database sizes, checking binary log sizes with `SHOW BINARY LOGS`, and monitoring undo log and temp tablespace files at the OS level. Set Prometheus alerts at 80% disk usage and track weekly growth trends to plan storage expansions before disk fills.
