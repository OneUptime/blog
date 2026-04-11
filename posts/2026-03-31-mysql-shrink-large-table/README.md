# How to Shrink a Large MySQL Table

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Storage, InnoDB, Optimization, Table

Description: Learn how to shrink a large MySQL table by reclaiming wasted space after deletes, using OPTIMIZE TABLE, pt-online-schema-change, and partitioning strategies.

---

## Why MySQL Tables Grow Larger Than Needed

When rows are deleted from an InnoDB table, the space is not immediately returned to the OS. InnoDB marks pages as free internally but retains the file on disk. After large deletes or bulk updates, the `.ibd` file may be significantly larger than the actual data it contains - this is called fragmentation or wasted space.

Check the current table size and free space:

```sql
SELECT
  table_name,
  ROUND(data_length / 1073741824, 2) AS data_gb,
  ROUND(index_length / 1073741824, 2) AS index_gb,
  ROUND(data_free / 1073741824, 2) AS free_gb
FROM information_schema.TABLES
WHERE table_schema = 'mydb' AND table_name = 'events'
ORDER BY data_free DESC;
```

If `free_gb` is significant compared to `data_gb`, the table has wasted space that can be reclaimed.

## Method 1 - OPTIMIZE TABLE

`OPTIMIZE TABLE` rebuilds the table and indexes, reclaiming free space:

```sql
OPTIMIZE TABLE events;
```

For InnoDB, this is equivalent to `ALTER TABLE ... ENGINE=InnoDB`. It creates a new table file, copies all rows, and drops the old file. The operation:
- Requires disk space equal to the current table size during execution
- Acquires a metadata lock (can block reads/writes briefly in older MySQL)
- Is safe to run on MySQL 8.0 with online DDL for most cases

Monitor progress:

```sql
SELECT EVENT_NAME, WORK_COMPLETED, WORK_ESTIMATED
FROM performance_schema.events_stages_current;
```

## Method 2 - pt-online-schema-change (No Downtime)

For very large tables on busy systems, `pt-online-schema-change` (pt-osc) rebuilds the table online with minimal locking:

```bash
pt-online-schema-change \
  --alter "ENGINE=InnoDB" \
  --execute \
  D=mydb,t=events \
  --user=root \
  --password=secret \
  --progress=percentage,5 \
  --no-check-replication-filters
```

pt-osc creates a shadow table, copies rows in batches, keeps it in sync via triggers, then renames the tables atomically.

## Method 3 - Rebuild via CREATE TABLE + INSERT SELECT

For the most control, rebuild the table manually:

```sql
-- Create new table with same structure
CREATE TABLE events_new LIKE events;

-- Copy data in batches (for very large tables)
INSERT INTO events_new SELECT * FROM events WHERE id BETWEEN 1 AND 1000000;
INSERT INTO events_new SELECT * FROM events WHERE id BETWEEN 1000001 AND 2000000;
-- ... continue in batches

-- Swap tables atomically
RENAME TABLE events TO events_old, events_new TO events;

-- Drop old table after verifying new table
DROP TABLE events_old;
```

## Method 4 - Enable innodb_file_per_table

If the table is in the shared tablespace (`innodb_file_per_table = OFF`), space cannot be returned to the OS even with OPTIMIZE. Check the setting:

```sql
SHOW VARIABLES LIKE 'innodb_file_per_table';
```

If it is OFF, move the table to its own tablespace:

```ini
[mysqld]
innodb_file_per_table = ON
```

Then run `OPTIMIZE TABLE` to move the data into a per-table `.ibd` file that the OS can reclaim.

## Preventing Future Bloat

- Archive or delete old data regularly with small batched deletes rather than large batch deletes
- Use partitioning for time-series tables - dropping a partition is instant and reclaims space immediately

```sql
ALTER TABLE events DROP PARTITION p_2023;
```

## Summary

Shrink a large MySQL table by running `OPTIMIZE TABLE` (acquires brief locks), using `pt-online-schema-change` for zero-downtime rebuilds, or manually recreating via `CREATE TABLE ... LIKE` and `RENAME TABLE`. Ensure `innodb_file_per_table = ON` so space can be returned to the OS. Prevent future bloat with partitioning and regular batched data archival.
