# How to Use sys Schema Formatting Functions in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, sys Schema, Function, Formatting, Diagnostic

Description: Learn how to use MySQL sys schema formatting functions to convert raw Performance Schema values into human-readable bytes, latency, and statement text.

---

## Overview

The MySQL `sys` schema includes a set of utility functions that format raw numeric values from Performance Schema into human-readable strings. These functions are used internally by all `sys` schema views but are also available for use in your own queries.

## format_bytes()

Converts raw byte counts into human-readable format:

```sql
SELECT
  sys.format_bytes(1024) AS one_kb,
  sys.format_bytes(1048576) AS one_mb,
  sys.format_bytes(1073741824) AS one_gb,
  sys.format_bytes(2684354560) AS two_point_five_gb;
```

Output:
```text
one_kb: 1.00 KiB
one_mb: 1.00 MiB
one_gb: 1.00 GiB
two_point_five_gb: 2.50 GiB
```

## format_time()

Converts picosecond timer values from Performance Schema into readable duration strings:

```sql
SELECT
  sys.format_time(1000000000) AS one_ms,
  sys.format_time(1000000000000) AS one_sec,
  sys.format_time(60000000000000) AS one_min;
```

Output:
```text
one_ms: 1.00 ms
one_sec: 1.00 s
one_min: 1.00 min
```

## format_statement()

Truncates long SQL statements for display while preserving the beginning and end:

```sql
SELECT sys.format_statement(
  'SELECT a, b, c, d, e, f, g FROM very_long_table_name WHERE id = 1 AND status = ''active'''
) AS short_stmt;
```

## ps_thread_id()

Returns the Performance Schema thread ID for a given MySQL processlist ID:

```sql
SELECT sys.ps_thread_id(CONNECTION_ID()) AS my_ps_thread_id;
```

## Using Formatting Functions in Custom Queries

These functions make raw Performance Schema queries much more readable:

```sql
SELECT
  FILE_NAME,
  sys.format_bytes(SUM_NUMBER_OF_BYTES_READ) AS bytes_read,
  sys.format_bytes(SUM_NUMBER_OF_BYTES_WRITE) AS bytes_written,
  sys.format_time(SUM_TIMER_WAIT) AS total_wait
FROM performance_schema.file_summary_by_instance
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 10;
```

## ps_is_account_enabled()

Check if Performance Schema is enabled for a given account:

```sql
SELECT sys.ps_is_account_enabled('%', 'app_user') AS is_enabled;
```

## Configuring sys Schema Options

The `sys.sys_config` table controls some `sys` schema behavior:

```sql
SELECT * FROM sys.sys_config;

-- Change statement truncation length
UPDATE sys.sys_config
SET value = '256'
WHERE variable = 'statement_truncate_len';
```

## format_path()

Shortens file paths by replacing the MySQL data directory with `@@datadir`:

```sql
SELECT sys.format_path('/var/lib/mysql/mydb/orders.ibd') AS short_path;
-- Output: @@datadir/mydb/orders.ibd
```

## Summary

The `sys` schema formatting functions transform raw Performance Schema numeric values into easily readable representations of bytes, time durations, and SQL text. Using `format_bytes()`, `format_time()`, and `format_statement()` in your custom diagnostic queries makes the output instantly interpretable without manual unit conversion, saving time during incident investigation and routine performance monitoring.
