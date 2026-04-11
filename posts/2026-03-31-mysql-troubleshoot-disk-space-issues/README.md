# How to Troubleshoot MySQL Disk Space Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Disk Space, InnoDB, Tablespace, Troubleshooting

Description: Learn how to diagnose and fix MySQL disk space issues including full data directories, bloated InnoDB tablespace files, and large binary log accumulation.

---

## Identifying the Problem

When MySQL runs out of disk space, writes fail with errors like `ERROR 1114 (HY000): The table is full` or the server halts. First, confirm disk usage:

```bash
df -h /var/lib/mysql
du -sh /var/lib/mysql/*
```

## Finding the Largest Tables

Identify which tables consume the most disk space:

```sql
SELECT
  table_schema,
  table_name,
  ROUND((data_length + index_length) / 1024 / 1024, 2) AS size_mb,
  ROUND(data_free / 1024 / 1024, 2)                     AS free_mb
FROM information_schema.TABLES
ORDER BY (data_length + index_length) DESC
LIMIT 20;
```

The `data_free` column shows unused space inside the tablespace that can be reclaimed.

## Reclaiming Space with OPTIMIZE TABLE

InnoDB retains free pages after large deletes. `OPTIMIZE TABLE` rebuilds the table and reclaims that space:

```sql
OPTIMIZE TABLE large_events_table;
```

For very large tables, use `ALTER TABLE ... ENGINE=InnoDB` instead, which also rebuilds but with more control:

```sql
ALTER TABLE large_events_table ENGINE=InnoDB;
```

Warning: both operations create a temporary copy of the table. Ensure you have at least as much free space as the table size before running them.

## Binary Logs

Binary logs accumulate quickly. Check their total size:

```bash
du -sh /var/lib/mysql/binlog*
mysql -u root -p -e "SHOW BINARY LOGS;"
```

Purge old binary logs that are no longer needed by replicas:

```sql
-- Purge logs older than 3 days
PURGE BINARY LOGS BEFORE DATE_SUB(NOW(), INTERVAL 3 DAY);

-- Or purge up to a specific file
PURGE BINARY LOGS TO 'binlog.000120';
```

Configure automatic expiry:

```bash
# In mysqld.cnf
binlog_expire_logs_seconds = 259200  # 3 days
```

## InnoDB Undo Log Space

The undo tablespace can grow large during long-running transactions:

```sql
SELECT NAME,
       ROUND(FILE_SIZE / 1024 / 1024, 2) AS size_mb
FROM information_schema.INNODB_TABLESPACES
WHERE SPACE_TYPE = 'Undo';
```

Identify and terminate long transactions that are holding undo log space:

```sql
SELECT trx_id, trx_started, trx_state,
       TIMESTAMPDIFF(MINUTE, trx_started, NOW()) AS minutes_running
FROM information_schema.INNODB_TRX
ORDER BY trx_started
LIMIT 10;
```

Kill any transaction that has been running for hours.

## Temporary Files

MySQL uses disk space for temporary tables during sorts and GROUP BY operations. Check `tmpdir`:

```sql
SHOW VARIABLES LIKE 'tmpdir';
```

```bash
df -h $(mysql -u root -p -sNe "SHOW VARIABLES LIKE 'tmpdir';" | awk '{print $2}')
```

Ensure the `tmpdir` partition has adequate space or point it to a larger partition.

## General Log and Error Log

The general query log can grow very large if enabled:

```sql
SHOW VARIABLES LIKE 'general_log%';
SET GLOBAL general_log = 'OFF';
```

Truncate or rotate error and slow query logs periodically:

```bash
mv /var/log/mysql/slow.log /var/log/mysql/slow.log.bak
mysqladmin -u root -p flush-logs
```

## Summary

MySQL disk space issues usually originate from table bloat after mass deletes, accumulated binary logs, large undo tablespace from long transactions, or enabled query logs. Use `information_schema.TABLES` to find space hogs, run `OPTIMIZE TABLE` or `ALTER TABLE ... ENGINE=InnoDB` to reclaim fragmented space, and configure `binlog_expire_logs_seconds` to automate log purge. Monitor disk usage with alerts before it reaches 80% capacity.
