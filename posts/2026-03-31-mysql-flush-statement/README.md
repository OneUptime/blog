# How to Use FLUSH Statement in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Administration, Cache

Description: Learn how to use the FLUSH statement in MySQL to clear caches, reload configuration, and reset server state for maintenance and troubleshooting.

---

## What Is the FLUSH Statement

The `FLUSH` statement in MySQL is an administrative command used to clear internal caches, reload configuration files, close and reopen log files, and reset various server components. It requires the `RELOAD` privilege and is commonly used during maintenance tasks, after configuration changes, and when troubleshooting performance issues.

The general syntax is:

```sql
FLUSH [NO_WRITE_TO_BINLOG | LOCAL] flush_option [, flush_option] ...;
```

The optional `NO_WRITE_TO_BINLOG` or its alias `LOCAL` prevents the flush operation from being written to the binary log, which is useful on replica servers.

## Common FLUSH Options

MySQL supports a wide range of flush options. Here is a summary:

```sql
-- Flush and close all open log files
FLUSH LOGS;

-- Reload the grant tables from disk
FLUSH PRIVILEGES;

-- Close all open tables and flush the table cache
FLUSH TABLES;

-- Flush the query cache (removed in MySQL 8.0)
FLUSH QUERY CACHE;

-- Clear the host cache (for failed connection tracking)
FLUSH HOSTS;

-- Reset session status variables and fold them into global values
FLUSH STATUS;

-- Flush replication relay logs
FLUSH RELAY LOGS;
```

## Flushing Multiple Options at Once

You can combine multiple flush targets in a single statement:

```sql
FLUSH LOGS, STATUS;
```

This is more efficient than issuing separate `FLUSH` commands.

## FLUSH TABLES

`FLUSH TABLES` closes all open tables, forces all tables in use to be closed, and flushes the prepared statement cache. It is often used before making a backup:

```sql
-- Close all open tables
FLUSH TABLES;

-- Close specific tables
FLUSH TABLES users, orders;

-- Lock all tables for a consistent backup snapshot
FLUSH TABLES WITH READ LOCK;
```

After `FLUSH TABLES WITH READ LOCK`, no writes are allowed until you run `UNLOCK TABLES`.

## FLUSH PRIVILEGES

`FLUSH PRIVILEGES` is only needed after legacy manual repair of grant tables. If you use `GRANT`, `REVOKE`, `CREATE USER`, `ALTER USER`, or `DROP USER`, `FLUSH PRIVILEGES` is not needed because MySQL handles the reload automatically.

## FLUSH LOGS

`FLUSH LOGS` closes and reopens all log files. This is useful for log rotation:

```sql
FLUSH LOGS;

-- Flush only specific log types
FLUSH BINARY LOGS;
FLUSH ERROR LOGS;
FLUSH GENERAL LOGS;
FLUSH SLOW LOGS;
FLUSH RELAY LOGS;
```

After flushing binary logs, a new binary log file is created with an incremented sequence number.

## FLUSH HOSTS

MySQL maintains a host cache to avoid repeated DNS lookups. If a host has too many connection errors, MySQL blocks it. Flushing the host cache clears those blocks:

```sql
FLUSH HOSTS;
```

Note that `FLUSH HOSTS` is deprecated as of MySQL 8.0.23 and removed in MySQL 8.4. Use the performance schema instead:

```sql
TRUNCATE TABLE performance_schema.host_cache;
```

## Using LOCAL to Prevent Binary Log Entry

On a replica server you may want to flush without logging the operation:

```sql
FLUSH LOCAL TABLES;
-- or equivalently
FLUSH NO_WRITE_TO_BINLOG TABLES;
```

## Summary

The `FLUSH` statement is a powerful administrative tool in MySQL for clearing caches, reloading configurations, and rotating logs. Use `FLUSH PRIVILEGES` only after legacy grant-table repair, `FLUSH TABLES WITH READ LOCK` for consistent backups, and `FLUSH LOGS` for log rotation. Always use `LOCAL` on replicas to avoid replicating administrative flush operations.
