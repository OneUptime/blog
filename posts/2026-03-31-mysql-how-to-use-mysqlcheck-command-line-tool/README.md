# How to Use mysqlcheck Command-Line Tool

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Table Maintenance, Mysqlcheck, Repair, OPTIMIZE

Description: Learn how to use the mysqlcheck command-line tool to check, repair, analyze, and optimize MySQL tables without needing to run SQL commands manually.

---

## What Is mysqlcheck

`mysqlcheck` is a MySQL command-line utility that performs maintenance operations on database tables. It wraps the SQL statements `CHECK TABLE`, `REPAIR TABLE`, `ANALYZE TABLE`, and `OPTIMIZE TABLE` into a convenient shell tool. It can operate on a single table, an entire database, or all databases at once.

## Basic Syntax

```bash
mysqlcheck [options] database_name [table_name ...]
```

## Check Tables for Errors

The default operation is to check tables for corruption or errors:

```bash
mysqlcheck -u root -p myapp
```

To check specific tables:

```bash
mysqlcheck -u root -p myapp orders customers
```

## Check All Databases

Use `--all-databases` to check every table on the server:

```bash
mysqlcheck -u root -p --all-databases
```

## Analyze Tables

`ANALYZE TABLE` updates index statistics used by the query optimizer:

```bash
mysqlcheck -u root -p --analyze myapp
```

Or for all databases:

```bash
mysqlcheck -u root -p --analyze --all-databases
```

Run this periodically after large bulk inserts or deletes to keep the optimizer's statistics accurate.

## Optimize Tables

`OPTIMIZE TABLE` reclaims fragmented space and rebuilds index statistics:

```bash
mysqlcheck -u root -p --optimize myapp
```

For InnoDB tables, `OPTIMIZE TABLE` rebuilds the table by doing `ALTER TABLE ... FORCE`, which can take significant time on large tables.

```bash
mysqlcheck -u root -p --optimize --all-databases
```

## Repair Tables

`REPAIR TABLE` fixes corrupted MyISAM or ARCHIVE tables:

```bash
mysqlcheck -u root -p --repair myapp
```

Note: InnoDB tables cannot be repaired with `REPAIR TABLE`. For InnoDB corruption, use backup restoration or `innodb_force_recovery`.

## Auto-Repair Mode

Use `--auto-repair` to automatically repair any tables that fail the check:

```bash
mysqlcheck -u root -p --check --auto-repair myapp
```

This first checks all tables and then repairs only the ones with errors.

## Check Tables After Upgrade

Before or after a MySQL version upgrade, check that all tables are compatible:

```bash
mysqlcheck -u root -p --all-databases --check-upgrade
```

This is equivalent to running `CHECK TABLE ... FOR UPGRADE` on every table.

## Sample Output

```text
myapp.customers                            OK
myapp.orders                               OK
myapp.sessions                             warning : 2 clients are using or haven't closed the table properly
myapp.sessions                             error   : Table upgrade required
```

A table with `OK` status passed the check. Any rows with `error` or `warning` need attention.

## Verbose Mode

Use `-v` to see each operation as it runs:

```bash
mysqlcheck -u root -p --optimize -v myapp
```

Output:

```text
myapp.customers
note     : Table does not support optimize, doing recreate + analyze instead
status   : OK
myapp.orders
note     : Table does not support optimize, doing recreate + analyze instead
status   : OK
```

## Use a Defaults File

To avoid entering passwords in the command line, use a MySQL options file:

```bash
# /etc/mysql/maintenance.cnf
[client]
user=maintenance
password=secret
host=localhost
```

Then run:

```bash
mysqlcheck --defaults-file=/etc/mysql/maintenance.cnf --all-databases
```

## Scheduled Maintenance Script

A cron-based script that analyzes all tables weekly:

```bash
#!/bin/bash
LOG="/var/log/mysql/mysqlcheck_$(date +%Y-%m-%d).log"

mysqlcheck \
  --defaults-file=/etc/mysql/maintenance.cnf \
  --analyze \
  --all-databases \
  --verbose \
  >> "$LOG" 2>&1

echo "mysqlcheck analyze completed. See $LOG"
```

Schedule with cron:

```text
0 2 * * 0  /usr/local/bin/mysql_weekly_maintenance.sh
```

## Operations Summary

| Flag | SQL Equivalent | Purpose |
|------|---------------|---------|
| (default) | `CHECK TABLE` | Check for corruption |
| `--analyze` | `ANALYZE TABLE` | Update index statistics |
| `--optimize` | `OPTIMIZE TABLE` | Defragment and rebuild |
| `--repair` | `REPAIR TABLE` | Fix corrupted tables (MyISAM) |
| `--check-upgrade` | `CHECK TABLE ... FOR UPGRADE` | Verify upgrade compatibility |
| `--auto-repair` | Automatic | Check then repair on error |

## Summary

`mysqlcheck` simplifies routine MySQL table maintenance by wrapping check, analyze, optimize, and repair operations into a single command. Using `--analyze` after large data changes keeps query performance optimal, while `--auto-repair` with `--check` provides a safety net for detecting and fixing table corruption on MyISAM storage engines.
