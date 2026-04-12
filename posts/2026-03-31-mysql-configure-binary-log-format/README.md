# How to Configure Binary Log Format (ROW, STATEMENT, MIXED) in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Binary Log, Replication, Configuration, Database

Description: Learn how to configure MySQL binary log formats - ROW, STATEMENT, and MIXED - and understand when to use each format for replication and recovery.

---

MySQL binary logs can record changes in three different formats: STATEMENT, ROW, and MIXED. The format you choose affects replication accuracy, binary log size, and recovery capabilities. Understanding these differences is essential for production MySQL deployments. Note that `binlog_format` is deprecated as of MySQL 8.0.34 and ROW is the default; it may be removed in a future version where ROW will be the only format.

## The Three Binary Log Formats

**STATEMENT** format records the SQL statements that caused data changes. It produces smaller binary logs but can cause inconsistencies with non-deterministic functions.

**ROW** format records the actual row changes - before and after images. It is accurate and safe but produces larger binary logs, especially for bulk operations.

**MIXED** format uses STATEMENT by default and automatically switches to ROW when a statement is non-deterministic (such as those using `UUID()`, `RAND()`, `SYSDATE()`, or user-defined functions).

## Checking the Current Format

```sql
SHOW VARIABLES LIKE 'binlog_format';
```

## Setting the Binary Log Format

Set it globally (effective for new connections):

```sql
SET GLOBAL binlog_format = 'ROW';
```

Set it for the current session only:

```sql
SET SESSION binlog_format = 'STATEMENT';
```

Configure it permanently in `my.cnf`:

```ini
[mysqld]
log_bin = /var/lib/mysql/binlogs/mysql-bin
binlog_format = ROW
```

## ROW Format in Detail

ROW format is recommended for most production setups:

```ini
[mysqld]
binlog_format = ROW
binlog_row_image = FULL       # FULL, MINIMAL, or NOBLOB
binlog_row_metadata = MINIMAL # or FULL for CDC tools
```

ROW format guarantees that replicas apply exactly the same row changes as the source, regardless of triggers, functions, or session variables.

## STATEMENT Format Risks

STATEMENT format can cause replication divergence in these scenarios:

```sql
-- These statements are non-deterministic and unsafe in STATEMENT mode
INSERT INTO audit_log (id, created_at) VALUES (UUID(), NOW());
UPDATE orders SET price = price * RAND() WHERE status = 'pending';
```

MySQL will warn about unsafe statements:

```text
[Warning] Unsafe statement written to binary log using statement format.
Statement is unsafe because it uses a system function that may return
a different value on replica.
```

## MIXED Format Behavior

MIXED format is a compromise - it writes most statements as SQL but switches to ROW format automatically:

```sql
-- This switches to ROW format automatically in MIXED mode
INSERT INTO sessions VALUES (UUID(), NOW(), 'user123');
```

You can see how a statement was logged:

```bash
mysqlbinlog --verbose /var/lib/mysql/binlogs/mysql-bin.000001 | grep -A 5 "# at"
```

## Comparing Format Impact on Log Size

```sql
-- Check current binary log size
SHOW BINARY LOGS;

-- For a bulk insert, STATEMENT logs 1 line; ROW logs 1 line per row changed
```

For a bulk load of 100,000 rows:
- STATEMENT: logs one `LOAD DATA` or `INSERT ... SELECT` statement
- ROW: logs 100,000 row change events

## Changing Format on a Live System

To change binary log format without restart:

```sql
SET GLOBAL binlog_format = 'ROW';
-- Note: this only affects new sessions; existing sessions keep their current format
```

On replicas, stop the replica thread before changing format:

```sql
STOP REPLICA;
SET GLOBAL binlog_format = 'ROW';
START REPLICA;
```

## Summary

ROW format is the safest choice for most MySQL deployments - it guarantees replication accuracy and supports point-in-time recovery correctly. STATEMENT format is space-efficient but risky with non-deterministic SQL. MIXED format is a reasonable middle ground for legacy applications. Configure `binlog_format = ROW` in `my.cnf` and pair it with `binlog_row_image = MINIMAL` to reduce log size while maintaining correctness.
