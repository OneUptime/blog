# How to Track MySQL Temporary Table Creation Rate

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Performance, Monitoring, Temporary Table, Database

Description: Learn how to track MySQL temporary table creation rate using status variables to detect memory pressure and disk spills from complex queries.

---

## Why Temporary Tables Matter

MySQL creates internal temporary tables during query execution when it cannot satisfy a sort, GROUP BY, DISTINCT, or subquery result in memory alone. There are two types:

- **In-memory temporary tables**: Fast, using the TempTable or MEMORY storage engine
- **On-disk temporary tables**: Slow, written to disk when the in-memory size limit is exceeded

A rising rate of on-disk temporary tables is a strong signal that queries are generating large intermediate result sets. This causes I/O pressure, higher latency, and can degrade the entire server if many queries are spilling to disk simultaneously.

## Reading Temporary Table Status Variables

MySQL provides three status variables for temporary table tracking:

```sql
SHOW GLOBAL STATUS LIKE 'Created_tmp%';
```

This returns:
- `Created_tmp_tables` - total internal temporary tables created since startup (both in-memory and on-disk)
- `Created_tmp_disk_tables` - total temporary tables that spilled to disk
- `Created_tmp_files` - number of temporary files used by the sort buffer

The ratio of disk tables to total tables is the most important metric:

```sql
SELECT
  (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Created_tmp_disk_tables') AS disk_tmp,
  (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Created_tmp_tables') AS total_tmp;
```

If `disk_tmp / total_tmp` exceeds 10-20%, you likely have queries generating large intermediate result sets.

## Computing the Rate Over Time

```bash
#!/bin/bash
MYSQL="mysql -u monitor -p'secret' -N -B"

read DISK1 MEM1 <<< $(
  $MYSQL -e "
    SELECT
      (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Created_tmp_disk_tables'),
      (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Created_tmp_tables');
  "
)

sleep 60

read DISK2 MEM2 <<< $(
  $MYSQL -e "
    SELECT
      (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Created_tmp_disk_tables'),
      (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Created_tmp_tables');
  "
)

DISK_RATE=$(( (DISK2 - DISK1) / 60 ))
MEM_RATE=$(( (MEM2 - MEM1) / 60 ))
echo "Disk tmp tables/sec: $DISK_RATE"
echo "Memory tmp tables/sec: $MEM_RATE"
```

## Adjusting Memory Limits

The `tmp_table_size` and `max_heap_table_size` variables control how large an in-memory temporary table can grow before it spills to disk. Both must be set; MySQL uses the smaller of the two:

```sql
SHOW VARIABLES LIKE 'tmp_table_size';
SHOW VARIABLES LIKE 'max_heap_table_size';
```

To increase the limit:

```sql
SET GLOBAL tmp_table_size = 64 * 1024 * 1024;        -- 64 MB
SET GLOBAL max_heap_table_size = 64 * 1024 * 1024;   -- 64 MB
```

Be careful: this memory is allocated per session, so setting it too high on a busy server with many concurrent queries can exhaust RAM. A value of 32-64 MB is reasonable for most workloads.

## Finding Queries That Create Disk Temporary Tables

Enable Performance Schema statement instrumentation and look for queries with `tmp_disk_tables > 0`:

```sql
SELECT
  DIGEST_TEXT,
  COUNT_STAR,
  SUM_CREATED_TMP_DISK_TABLES,
  SUM_CREATED_TMP_TABLES,
  ROUND(SUM_TIMER_WAIT / 1e12, 2) AS total_time_sec
FROM performance_schema.events_statements_summary_by_digest
WHERE SUM_CREATED_TMP_DISK_TABLES > 0
ORDER BY SUM_CREATED_TMP_DISK_TABLES DESC
LIMIT 10;
```

This shows which query patterns are generating the most disk spills.

## Prometheus Alerting

```yaml
groups:
  - name: mysql_tmp_tables
    rules:
      - alert: MySQLHighDiskTmpTableRate
        expr: rate(mysql_global_status_created_tmp_disk_tables[5m]) > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High disk temporary table creation rate on {{ $labels.instance }}"
          description: "More than 5 disk temporary tables per second. Check for large GROUP BY or sort operations."
```

## Summary

Tracking MySQL temporary table creation rate requires monitoring `Created_tmp_tables` and `Created_tmp_disk_tables` status variables, with particular attention to the disk spill ratio. When the disk temporary table rate rises, increase `tmp_table_size` and `max_heap_table_size` for quick relief, then use Performance Schema to identify the specific queries generating large intermediate result sets for longer-term optimization.
