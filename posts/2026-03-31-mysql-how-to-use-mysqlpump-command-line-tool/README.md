# How to Use mysqlpump Command-Line Tool

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Backup, Mysqlpump, Parallel Export, Database Administration

Description: Learn how to use mysqlpump, MySQL's parallel backup utility, to export databases faster with concurrent table dumping and progress reporting.

---

## What Is mysqlpump

`mysqlpump` is a MySQL command-line tool introduced in MySQL 5.7.8 as a faster alternative to `mysqldump`. It supports parallel exports using multiple threads, which significantly reduces backup time for large databases. It also provides progress reporting and more flexible filtering options.

**Note:** `mysqlpump` was deprecated in MySQL 8.0.34 and removed in MySQL 8.4.0. For MySQL 8.4 and later, use `mysqldump` or MySQL Shell's `util.dumpInstance()` instead.

## Basic Syntax

```bash
mysqlpump [options] > output_file.sql
```

`mysqlpump` writes output to stdout by default.

## Dump All Databases

```bash
mysqlpump -u root -p > full_backup.sql
```

## Dump a Specific Database

```bash
mysqlpump -u root -p --include-databases=myapp > myapp_backup.sql
```

## Parallel Export with Multiple Threads

Use `--default-parallelism` to set the number of parallel threads:

```bash
mysqlpump -u root -p --default-parallelism=4 > full_backup.sql
```

This creates a default queue with 4 threads dumping tables concurrently.

## Per-Database Parallelism

You can configure parallelism per database using queues:

```bash
mysqlpump -u root -p \
  --parallel-schemas=4:myapp \
  --parallel-schemas=2:myapp2 \
  > full_backup.sql
```

This allocates 4 threads to `myapp` and 2 threads to `myapp2` simultaneously.

## Progress Reporting

Enable progress reporting with `--watch-progress`:

```bash
mysqlpump -u root -p --watch-progress > full_backup.sql
```

Output looks like:

```text
Dump progress: 0/2 tables, 0/0 rows
Dump progress: 1/2 tables, 500000/1234567 rows
Dump progress: 2/2 tables, 1234567/1234567 rows
Dump completed in 12345 milliseconds
```

## Compress the Output

```bash
mysqlpump -u root -p --compress-output=LZ4 > full_backup.lz4
```

Supported algorithms: `LZ4`, `ZLIB`.

To decompress:

```bash
lz4_decompress full_backup.lz4 full_backup.sql
```

For ZLIB-compressed files, use `zlib_decompress` instead.

## Schema Only (No Data)

```bash
mysqlpump -u root -p --skip-dump-rows > schema_only.sql
```

## Exclude Specific Databases

```bash
mysqlpump -u root -p \
  --exclude-databases=information_schema,performance_schema,sys \
  > user_databases.sql
```

## Dump Only Specific Tables

```bash
mysqlpump -u root -p \
  --include-databases=myapp \
  --include-tables=orders,customers \
  > selected_tables.sql
```

## Exclude Specific Tables

```bash
mysqlpump -u root -p \
  --include-databases=myapp \
  --exclude-tables=audit_logs,temp_data \
  > myapp_no_logs.sql
```

## Include Users and Grants

`mysqlpump` can export user accounts and privileges:

```bash
mysqlpump -u root -p --users > users_backup.sql
```

To export only users (no database data):

```bash
mysqlpump -u root -p \
  --exclude-databases=% \
  --users \
  > users_only.sql
```

## Add DROP Statements

```bash
mysqlpump -u root -p \
  --add-drop-table \
  --add-drop-database \
  --include-databases=myapp \
  > myapp_with_drops.sql
```

## Defer Index Creation

For faster restores, use `--defer-table-indexes` to add indexes after all rows are inserted:

```bash
mysqlpump -u root -p \
  --defer-table-indexes \
  --include-databases=myapp \
  > myapp_backup.sql
```

This is the default behavior in `mysqlpump`.

## Restoring a Dump

Restore using the `mysql` client:

```bash
mysql -u root -p < myapp_backup.sql
```

For compressed output, decompress first:

```bash
lz4_decompress myapp_backup.lz4 myapp_backup.sql
mysql -u root -p < myapp_backup.sql
```

## Comparison with mysqldump

| Feature | mysqldump | mysqlpump |
|---------|-----------|-----------|
| Parallel export | No | Yes |
| Progress reporting | No | Yes |
| Built-in compression | No | Yes (LZ4, ZLIB) |
| Deferred indexes | No | Yes |
| User export | Via `--all-databases` | Dedicated `--users` flag |
| Availability | MySQL 5.1+ | MySQL 5.7.8+ |

## Automated Parallel Backup Script

```bash
#!/bin/bash
DATE=$(date +%Y-%m-%d)
BACKUP_DIR="/var/backups/mysql"
mkdir -p "$BACKUP_DIR"

mysqlpump -u backup_user -p"$MYSQL_PASSWORD" \
  --default-parallelism=4 \
  --compress-output=LZ4 \
  --defer-table-indexes \
  --exclude-databases=information_schema,performance_schema,sys \
  > "$BACKUP_DIR/full_backup_$DATE.lz4"

echo "Backup completed: full_backup_$DATE.lz4"
```

## Summary

`mysqlpump` improves on `mysqldump` by supporting parallel table exports, built-in compression, and dedicated user backup options. For large databases with many tables, enabling multiple threads with `--default-parallelism` can dramatically reduce backup time. Use `--defer-table-indexes` and `--compress-output` to optimize both export and restore performance.
