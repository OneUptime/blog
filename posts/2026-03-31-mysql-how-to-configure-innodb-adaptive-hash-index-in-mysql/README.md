# How to Configure InnoDB Adaptive Hash Index in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Adaptive Hash Index, Configuration, Performance

Description: Learn how the InnoDB Adaptive Hash Index works in MySQL and how to configure, monitor, or disable it based on your workload characteristics.

---

## What Is the InnoDB Adaptive Hash Index?

The InnoDB Adaptive Hash Index (AHI) is a self-tuning in-memory hash index that InnoDB builds automatically on top of B-tree indexes. When InnoDB detects that a particular index lookup pattern is repeated frequently (e.g., always searching by the same column with equality conditions), it builds a hash index for that pattern in memory.

Hash lookups are O(1) compared to O(log n) for B-tree traversals, so the AHI can significantly speed up repeated point lookups on hot data.

## Checking Whether AHI Is Enabled

```sql
SHOW VARIABLES LIKE 'innodb_adaptive_hash_index';
```

```text
+----------------------------+-------+
| Variable_name              | Value |
+----------------------------+-------+
| innodb_adaptive_hash_index | ON    |
+----------------------------+-------+
```

The AHI is enabled by default.

## Configuring AHI Partitions

In MySQL 5.7 and later, the AHI can be divided into multiple partitions to reduce latch contention:

```sql
SHOW VARIABLES LIKE 'innodb_adaptive_hash_index_parts';
```

```text
+----------------------------------+-------+
| Variable_name                    | Value |
+----------------------------------+-------+
| innodb_adaptive_hash_index_parts | 8     |
+----------------------------------+-------+
```

Increase the number of parts if you see high contention on AHI latches in `SHOW ENGINE INNODB STATUS`:

```text
[mysqld]
innodb_adaptive_hash_index_parts = 16
```

This is a read-only variable that requires a MySQL restart.

## Monitoring AHI Usage

Check AHI hit rates in `SHOW ENGINE INNODB STATUS`:

```sql
SHOW ENGINE INNODB STATUS\G
```

Look for the `ADAPTIVE HASH INDEX` section:

```text
-------------------------------------
INSERT BUFFER AND ADAPTIVE HASH INDEX
-------------------------------------
Hash table size 553193, node heap has 0 buffer(s)
Hash table size 553193, node heap has 1 buffer(s)
0.00 hash searches/s, 0.00 non-hash searches/s
```

Also check the AHI counters in the `INNODB_METRICS` table:

```sql
SELECT
  NAME,
  COUNT,
  STATUS
FROM INFORMATION_SCHEMA.INNODB_METRICS
WHERE SUBSYSTEM = 'adaptive_hash_index';
```

The two key counters are `adaptive_hash_searches` (lookups served by the AHI) and `adaptive_hash_searches_btree` (lookups that fell back to B-tree traversal). A high ratio of `adaptive_hash_searches` to the total indicates the AHI is providing benefit.

## Disabling the AHI

The AHI can hurt performance in workloads with:
- Mostly range scans rather than point lookups
- Very large numbers of unique keys with few repeated accesses
- High contention on AHI latches (visible as `btr0sea.c` in mutex waits)

To disable at runtime:

```sql
SET GLOBAL innodb_adaptive_hash_index = OFF;
```

To disable permanently in `my.cnf`:

```text
[mysqld]
innodb_adaptive_hash_index = OFF
```

## Detecting AHI Latch Contention

High AHI contention appears in `SHOW ENGINE INNODB STATUS` under `SEMAPHORES`:

```text
----------
SEMAPHORES
----------
OS WAIT ARRAY INFO: reservation count 12345
OS WAIT ARRAY INFO: signal count 12000
RW-shared spins 0, rounds 0, OS waits 0
RW-excl spins 1234, rounds 5678, OS waits 900
RW-sx spins 0, rounds 0, OS waits 0
Spin rounds per wait: 0.00 RW-shared, 4.60 RW-excl, 0.00 RW-sx
```

If you see frequent waits on `btr0sea.c`, increasing `innodb_adaptive_hash_index_parts` or disabling AHI may help.

## Workloads That Benefit Most from AHI

- OLTP applications with frequent equality lookups on the same column values
- Applications with hot rows that are read repeatedly in short time windows
- Joins that repeatedly hit the same small lookup table

```sql
-- This type of query benefits from AHI:
SELECT * FROM users WHERE id = 12345;
SELECT * FROM sessions WHERE token = 'abc123';
```

## Summary

The InnoDB Adaptive Hash Index automatically builds in-memory hash indexes on frequently accessed B-tree lookup patterns, turning O(log n) scans into O(1) lookups. Monitor AHI efficiency via `SHOW ENGINE INNODB STATUS` and performance schema counters. Disable or increase partition count if high latch contention on AHI structures appears in semaphore wait statistics.
