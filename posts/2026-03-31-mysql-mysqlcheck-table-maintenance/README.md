# How to Use mysqlcheck for Table Maintenance in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Mysqlcheck, Table Maintenance, Administration, Repair

Description: Learn how to use the mysqlcheck command-line tool to check, analyze, optimize, and repair MySQL tables from the command line.

---

`mysqlcheck` is a command-line utility that performs table maintenance operations - check, analyze, optimize, and repair - without connecting interactively to MySQL. It is a convenient wrapper around the `CHECK TABLE`, `ANALYZE TABLE`, `OPTIMIZE TABLE`, and `REPAIR TABLE` SQL statements.

## Basic Syntax

```bash
mysqlcheck [options] db_name [table_name ...]
```

Common connection options:

```bash
mysqlcheck -u root -p -h 127.0.0.1 mydb mytable
```

## Checking Tables for Errors

Check all tables in a database:

```bash
mysqlcheck -u root -p mydb
```

Check a specific table:

```bash
mysqlcheck -u root -p mydb orders
```

Check all databases:

```bash
mysqlcheck -u root -p --all-databases
```

Output for a healthy table:

```text
mydb.orders                                        OK
```

Output for a corrupted table:

```text
mydb.orders
error    : Table './mydb/orders' is marked as crashed and should be repaired
```

## Analyzing Tables

Analyze table statistics to help the query optimizer make better execution plan decisions:

```bash
mysqlcheck -u root -p --analyze mydb
```

Or analyze all databases:

```bash
mysqlcheck -u root -p --analyze --all-databases
```

Equivalent to running `ANALYZE TABLE` for each table.

## Optimizing Tables

Reclaim unused space from deleted rows and defragment InnoDB tables:

```bash
mysqlcheck -u root -p --optimize mydb
```

For a specific table:

```bash
mysqlcheck -u root -p --optimize mydb large_table
```

This is equivalent to `OPTIMIZE TABLE`. For InnoDB tables, it performs an `ALTER TABLE ... FORCE` operation, which rebuilds the table.

## Repairing Tables

Repair corrupted MyISAM tables:

```bash
mysqlcheck -u root -p --repair mydb
```

For InnoDB tables, repair is not supported via `mysqlcheck`. Instead, use `ALTER TABLE ... ENGINE=InnoDB` to rebuild the table.

## Auto-Repair Mode

Run check and automatically repair any tables that fail:

```bash
mysqlcheck -u root -p --check --auto-repair mydb
```

## Checking Tables After an Upgrade

In MySQL versions prior to 8.0.16, you could check all tables for compatibility after a version upgrade:

```bash
mysqlcheck -u root -p --check-upgrade --all-databases
```

This was the equivalent of running `CHECK TABLE ... FOR UPGRADE` on every table. Note that `--check-upgrade` was deprecated in MySQL 8.0.16 and removed in MySQL 8.4. In current versions, the MySQL server automatically performs the necessary upgrade checks during the upgrade process via `mysql_upgrade` or the server startup with `--upgrade=AUTO` (the default).

## Using --extended for Thorough Checks

The `--extended` flag runs the most thorough check, testing all key lookups:

```bash
mysqlcheck -u root -p --extended mydb
```

This takes longer but catches more corruption types.

## Scheduling Maintenance with Cron

Add a weekly analyze job for a production database:

```bash
# /etc/cron.weekly/mysql-analyze
#!/bin/bash
mysqlcheck -u root -p"$MYSQL_PASSWORD" --analyze --all-databases \
  >> /var/log/mysql/mysqlcheck.log 2>&1
```

## Summary

`mysqlcheck` is a convenient command-line wrapper for MySQL table maintenance operations. Use `--check` to verify table integrity, `--analyze` to refresh optimizer statistics, `--optimize` to reclaim space and defragment InnoDB tables, and `--auto-repair` to automatically fix MyISAM tables after a check failure. In older MySQL versions (before 8.0.16), run `--check-upgrade` after MySQL version upgrades to ensure all tables are compatible with the new version; in MySQL 8.4 and later, the server handles upgrade checks automatically.
