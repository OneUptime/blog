# How to Understand InnoDB Auto-Increment Lock Modes in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Auto-Increment, Locking, Replication

Description: Understand MySQL InnoDB auto-increment lock modes 0, 1, and 2, and how to choose the right mode for performance and replication consistency.

---

## Why Auto-Increment Locking Matters

InnoDB uses a special locking mechanism to assign unique auto-increment values to rows. How long that lock is held - and whether it is a true table-level lock or a lighter mutex - is controlled by `innodb_autoinc_lock_mode`. The choice directly affects insert throughput and binlog-based replication safety.

## The Three Lock Modes

MySQL InnoDB supports three auto-increment lock modes, configured via `innodb_autoinc_lock_mode`:

**Mode 0 - Traditional:** A table-level AUTO-INC lock is held for the entire INSERT statement. This guarantees consecutive IDs and is safe for all replication formats, but serializes all inserts.

**Mode 1 - Consecutive (default before MySQL 8.0):** For simple single-row inserts, a lightweight mutex is used instead of a table lock. For bulk inserts where the row count is unknown at parse time (e.g., `INSERT ... SELECT`), a table-level AUTO-INC lock is still acquired. IDs are consecutive within a statement.

**Mode 2 - Interleaved (default in MySQL 8.0+):** A lightweight mutex is always used. IDs may not be consecutive across concurrent statements, but insert throughput is maximized. This mode requires row-based or mixed replication.

Check the current mode:

```sql
SHOW VARIABLES LIKE 'innodb_autoinc_lock_mode';
```

## Configuring the Lock Mode

Set the mode in `my.cnf` (requires restart):

```ini
[mysqld]
innodb_autoinc_lock_mode = 2
```

## Performance Comparison Example

Consider a scenario where 8 threads each perform 10,000 single-row inserts concurrently:

```sql
-- Thread 1
INSERT INTO orders (user_id, amount) VALUES (101, 99.99);

-- Thread 2 (concurrent)
INSERT INTO orders (user_id, amount) VALUES (205, 49.50);
```

With mode 0, only one thread inserts at a time due to the table lock. With mode 2, all 8 threads proceed simultaneously, leading to IDs like 1, 3, 5, 7, 2, 4, 6, 8 interleaved - but significantly higher throughput.

## Impact on Bulk Inserts

For `INSERT INTO ... SELECT ...` with an unknown row count, all three modes behave differently:

```sql
-- With mode 2, this still uses the lightweight mutex
INSERT INTO archive_orders SELECT * FROM orders WHERE created_at < '2024-01-01';
```

With mode 0 or 1, MySQL acquires a full table AUTO-INC lock for the duration of this statement, blocking all other inserts on the table.

## Replication Considerations

With statement-based replication (SBR) and mode 2, a replica may assign different auto-increment values than the source if concurrent inserts are replayed sequentially. This causes data divergence.

Always use row-based replication (RBR) or mixed replication when using mode 2:

```ini
[mysqld]
binlog_format = ROW
innodb_autoinc_lock_mode = 2
```

Verify the binlog format:

```sql
SHOW VARIABLES LIKE 'binlog_format';
```

## Monitoring AUTO-INC Lock Waits

To check if AUTO-INC locks are causing contention, query Performance Schema:

```sql
SELECT EVENT_NAME, COUNT_STAR, SUM_TIMER_WAIT / 1e12 AS total_wait_sec
FROM performance_schema.events_waits_summary_global_by_event_name
WHERE EVENT_NAME LIKE '%autoinc%'
ORDER BY SUM_TIMER_WAIT DESC;
```

## Choosing the Right Mode

- Use **mode 2** for write-heavy OLTP workloads with row-based replication. It provides the best insert throughput.
- Use **mode 1** if you need statement-based replication or require consecutive IDs for audit reasons.
- Use **mode 0** only for legacy compatibility or when you need consecutive (no interleaving) ID assignment across statements. Note that no lock mode prevents gaps caused by rollbacks or deletes.

## Summary

InnoDB auto-increment lock modes control the trade-off between insert performance and ID consecutiveness. Mode 2 (interleaved) is the MySQL 8.0 default and delivers the highest concurrency by using a lightweight mutex, but requires row-based replication. Set `innodb_autoinc_lock_mode = 2` with `binlog_format = ROW` for modern high-throughput deployments.
