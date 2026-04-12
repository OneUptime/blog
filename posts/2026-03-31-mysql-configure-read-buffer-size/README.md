# How to Configure read_buffer_size in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Configuration, Buffer, MyISAM, Performance

Description: Learn how MySQL read_buffer_size controls sequential scan performance for MyISAM tables and how to tune it appropriately for your workload.

---

## What Is read_buffer_size

`read_buffer_size` is the buffer size allocated for sequential (full table) scans on MyISAM tables. When MySQL reads rows sequentially from a MyISAM table without using an index, it reads data in chunks of `read_buffer_size` bytes to reduce disk I/O.

It is also used by some storage engine-independent operations such as:
- `ORDER BY` with temporary file sorting
- Reading rows for bulk insert operations

## Check the Current Value

```sql
SHOW VARIABLES LIKE 'read_buffer_size';
```

```text
+------------------+--------+
| Variable_name    | Value  |
+------------------+--------+
| read_buffer_size | 131072 |
+------------------+--------+
```

Default is 128 KB.

## When Does read_buffer_size Matter

Primarily for MyISAM tables performing full table scans. For InnoDB, the buffer pool handles caching more efficiently, so `read_buffer_size` has minimal effect. If you are using InnoDB exclusively, this variable provides little benefit.

Check if you have MyISAM tables:

```sql
SELECT table_schema, table_name, engine
FROM information_schema.tables
WHERE engine = 'MyISAM'
  AND table_schema NOT IN ('mysql', 'sys', 'information_schema', 'performance_schema')
ORDER BY table_schema, table_name;
```

## Increase read_buffer_size for MyISAM Workloads

```sql
SET GLOBAL read_buffer_size = 1048576;  -- 1 MB
```

In `my.cnf`:

```ini
[mysqld]
read_buffer_size = 1M
```

## Per-Session Configuration

For a specific session running heavy MyISAM scans:

```sql
SET SESSION read_buffer_size = 4194304;  -- 4 MB
SELECT COUNT(*) FROM large_myisam_table WHERE category = 'A';
```

## Detecting Sequential Scans

Check how often full table scans occur:

```sql
SHOW GLOBAL STATUS LIKE 'Handler_read%';
```

```text
+-----------------------------+-----------+
| Variable_name               | Value     |
+-----------------------------+-----------+
| Handler_read_first          | 23        |
| Handler_read_key            | 4520341   |
| Handler_read_last           | 2         |
| Handler_read_next           | 8934512   |
| Handler_read_prev           | 0         |
| Handler_read_rnd            | 1023456   |
| Handler_read_rnd_next       | 12034521  |
+-----------------------------+-----------+
```

`Handler_read_rnd_next` counts row reads during full table scans. A high value relative to `Handler_read_key` (index lookups) indicates many sequential scans where `read_buffer_size` matters.

## InnoDB Alternative: innodb_read_io_threads

For InnoDB, configure I/O threads instead of `read_buffer_size`. Note that `innodb_read_io_threads` is not a dynamic variable — it requires a server restart to take effect.

```sql
SHOW VARIABLES LIKE 'innodb_read_io_threads';
```

In `my.cnf`:

```ini
[mysqld]
innodb_read_io_threads = 8  # Default is 4
```

After changing, restart MySQL for the setting to take effect. More I/O threads improve InnoDB read performance by allowing more concurrent read-ahead operations.

## Recommended Values

| Workload | read_buffer_size |
|----------|-----------------|
| InnoDB only | 128 KB (default, leave as is) |
| MyISAM mixed | 512 KB - 2 MB |
| Heavy MyISAM analytics | 4 MB - 8 MB |

Keep in mind this is allocated per connection performing a scan.

## Summary

`read_buffer_size` controls sequential scan buffer size, primarily benefiting MyISAM workloads. For InnoDB-only setups, the default 128 KB is sufficient. For MyISAM-heavy workloads, increase to 512 KB - 4 MB and monitor `Handler_read_rnd_next` to verify sequential scan frequency. The buffer is allocated per connection on demand, so large values should be balanced against concurrent connection count.
