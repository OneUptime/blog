# How to Use mysqldump Command-Line Tool

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Backup, mysqldump, Command Line, Database Administration

Description: Learn how to use the mysqldump command-line tool to export MySQL databases, tables, and schemas for backup and migration purposes.

---

## What Is mysqldump

`mysqldump` is the standard MySQL command-line utility for creating logical backups. It exports database objects and data as SQL statements that can be replayed to recreate the original database state. It comes bundled with every MySQL installation.

## Basic Syntax

```bash
mysqldump [options] database_name [table_name ...] > output_file.sql
```

## Dump a Single Database

```bash
mysqldump -u root -p myapp > myapp_backup.sql
```

You will be prompted for a password. The resulting file contains `CREATE TABLE` and `INSERT` statements for all tables.

## Dump All Databases

Use `--all-databases` to export every database on the server:

```bash
mysqldump -u root -p --all-databases > all_databases.sql
```

## Dump Specific Tables

List table names after the database name to export only those tables:

```bash
mysqldump -u root -p myapp orders customers > orders_customers.sql
```

## Dump Only Schema (No Data)

Use `--no-data` to export only the table structure:

```bash
mysqldump -u root -p --no-data myapp > schema_only.sql
```

## Dump Only Data (No Schema)

Use `--no-create-info` to export only INSERT statements, skipping CREATE TABLE:

```bash
mysqldump -u root -p --no-create-info myapp > data_only.sql
```

## Add DROP TABLE Statements

By default, mysqldump includes `DROP TABLE IF EXISTS` before each `CREATE TABLE`. If this has been disabled, use `--add-drop-table` to re-enable it. Use `--skip-add-drop-table` to omit these statements:

```bash
mysqldump -u root -p --skip-add-drop-table myapp > myapp_no_drop.sql
```

## Include Stored Procedures and Triggers

By default, mysqldump includes triggers but not stored procedures. Use these flags to include both:

```bash
mysqldump -u root -p --routines --triggers myapp > full_backup.sql
```

## Include Events

```bash
mysqldump -u root -p --events myapp > full_backup.sql
```

## Compress the Output

Pipe to `gzip` to reduce file size:

```bash
mysqldump -u root -p myapp | gzip > myapp_backup.sql.gz
```

To restore a compressed backup:

```bash
gunzip < myapp_backup.sql.gz | mysql -u root -p myapp
```

## Consistent Backup with InnoDB

Use `--single-transaction` for a consistent InnoDB backup without locking tables. This uses a repeatable-read snapshot:

```bash
mysqldump -u root -p --single-transaction myapp > myapp_backup.sql
```

Do not use `--lock-tables` together with `--single-transaction` as they conflict.

## Locking Tables for MyISAM

For MyISAM tables that do not support transactions, use `--lock-tables`:

```bash
mysqldump -u root -p --lock-tables myapp > myapp_backup.sql
```

## Flush Logs and Record Binary Log Position

For point-in-time recovery, flush binary logs and record the position:

```bash
mysqldump -u root -p --single-transaction --flush-logs --source-data=2 myapp > myapp_backup.sql
```

The `--source-data=2` option writes the binary log filename and position as a comment at the top of the dump file. Note: in MySQL versions before 8.0.26, this option was called `--master-data`.

## Restoring a Dump

Use the `mysql` client to restore:

```bash
mysql -u root -p myapp < myapp_backup.sql
```

To restore all databases:

```bash
mysql -u root -p < all_databases.sql
```

## Useful Options Summary

| Option | Purpose |
|--------|---------|
| `--single-transaction` | Consistent InnoDB backup |
| `--routines` | Include stored procedures and functions |
| `--triggers` | Include triggers (on by default) |
| `--events` | Include scheduled events |
| `--no-data` | Schema only |
| `--no-create-info` | Data only |
| `--add-drop-table` | Drop tables before recreating (on by default) |
| `--flush-logs` | Flush binary logs before dump |
| `--source-data=2` | Record binlog position as comment |
| `--where` | Filter rows with a WHERE clause |

## Filter Rows During Export

Use `--where` to export a subset of rows from a table:

```bash
mysqldump -u root -p myapp orders --where="created_at >= '2025-01-01'" > recent_orders.sql
```

## Automating Backups

A basic automated backup script:

```bash
#!/bin/bash
DATE=$(date +%Y-%m-%d)
BACKUP_DIR="/var/backups/mysql"
mkdir -p "$BACKUP_DIR"

mysqldump -u backup_user -p"$MYSQL_PASSWORD" \
  --single-transaction \
  --routines \
  --events \
  myapp | gzip > "$BACKUP_DIR/myapp_$DATE.sql.gz"

echo "Backup completed: myapp_$DATE.sql.gz"
```

## Summary

`mysqldump` is a reliable and flexible tool for creating logical MySQL backups. Using `--single-transaction` ensures consistency for InnoDB databases without downtime, while `--routines` and `--events` capture all database objects. For large databases, consider MySQL Shell's dump utilities (`util.dumpInstance`, `util.dumpSchemas`) or MySQL Enterprise Backup for faster parallel exports.
