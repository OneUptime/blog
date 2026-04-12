# How to Use FLUSH TABLES in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Administration, Backup

Description: Learn how to use FLUSH TABLES in MySQL to close open tables, clear the table cache, and prepare for consistent backups using READ LOCK.

---

## What Is FLUSH TABLES

`FLUSH TABLES` closes all currently open tables in the MySQL server and flushes the table cache. MySQL keeps recently used tables open in a cache (controlled by `table_open_cache`) to avoid the overhead of reopening them. `FLUSH TABLES` empties this cache, forcing all subsequent queries to reopen the tables they need.

This command is most commonly used before taking a physical backup to ensure data files are in a consistent state.

```sql
FLUSH TABLES;
```

## Flushing Specific Tables

You can flush specific tables instead of all tables:

```sql
FLUSH TABLES users, orders, products;
```

This closes and clears the cache only for the named tables, which is more efficient when you only need to affect part of your schema.

## FLUSH TABLES WITH READ LOCK

The most important use of `FLUSH TABLES` in backup workflows is:

```sql
FLUSH TABLES WITH READ LOCK;
```

This command does two things:
1. Closes all open tables and flushes the table cache.
2. Acquires a global read lock that blocks all write operations until you release it.

While the lock is held, the database is in a consistent state - all reads are permitted but no writes can occur. This is the basis of a hot backup:

```bash
# The lock is session-scoped, so all commands must run in the same connection
mysql -e "FLUSH TABLES WITH READ LOCK; SYSTEM lvcreate --snapshot --name dbsnap --size 1G /dev/vg0/mysql; UNLOCK TABLES;"
```

## FLUSH TABLES ... FOR EXPORT

MySQL InnoDB supports exporting individual tables using `FLUSH TABLES ... FOR EXPORT`. This flushes the table and creates a `.cfg` metadata file that is needed when importing a tablespace into another MySQL instance:

```sql
FLUSH TABLES orders FOR EXPORT;
```

After this, you can copy the `.ibd` and `.cfg` files to another server. Release the lock when done:

```sql
UNLOCK TABLES;
```

## Checking the Table Cache

Before flushing, you can inspect the current table cache state:

```sql
-- Check how many tables are currently open
SHOW STATUS LIKE 'Open_tables';

-- Check the cache size limit
SHOW VARIABLES LIKE 'table_open_cache';
```

If `Open_tables` is consistently at the `table_open_cache` limit, MySQL is evicting tables frequently. Consider increasing the cache size rather than flushing manually.

## Impact of FLUSH TABLES

Flushing tables has these effects:

- All cached table structures are evicted, increasing next-access latency.
- All open table file descriptors are closed and must be reopened on next access.
- Waiting queries must wait until the flush completes.

For large databases with many tables, `FLUSH TABLES` can briefly pause the server. Prefer `FLUSH TABLES specific_table` over flushing everything when possible.

## Using LOCAL to Skip Replication

On a replica or when you do not want the command to be written to the binary log:

```sql
FLUSH LOCAL TABLES;
-- same as
FLUSH NO_WRITE_TO_BINLOG TABLES;
```

## Summary

`FLUSH TABLES` clears the MySQL table cache and closes open table file descriptors. Use `FLUSH TABLES WITH READ LOCK` to create a consistent snapshot for physical backups, `FLUSH TABLES table_name FOR EXPORT` to prepare InnoDB tablespaces for transport, and `FLUSH LOCAL TABLES` on replicas to avoid replicating the flush event.
