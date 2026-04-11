# How to Use Parallel Backup with mysqlpump in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Backup, Mysqlpump, Parallel, Performance

Description: Learn how to use mysqlpump to perform parallel database backups in MySQL, significantly reducing backup time for large databases compared to mysqldump.

---

`mysqlpump` is a backup utility introduced in MySQL 5.7 that extends `mysqldump` with parallel processing capabilities. While `mysqldump` processes databases and tables sequentially, `mysqlpump` uses multiple threads to dump tables simultaneously, dramatically reducing backup time for servers with many tables or large databases.

**Note:** `mysqlpump` was deprecated in MySQL 8.0.34 and removed in MySQL 8.4. For MySQL 8.4 and later, use `mysqldump` or MySQL Shell's dump utilities (`util.dumpInstance()`, `util.dumpSchemas()`) instead.

## mysqlpump vs mysqldump

| Feature | mysqldump | mysqlpump |
|---------|-----------|-----------|
| Parallelism | No | Yes (multiple threads) |
| Progress indicator | No | Yes |
| Filtering | Limited | Advanced |
| Output format | SQL | SQL (compressed optionally) |
| Consistency | `--single-transaction` | `--single-transaction` |

## Basic Parallel Backup

```bash
# Back up a database with 4 parallel threads
mysqlpump -u root -p \
  --default-parallelism=4 \
  myapp \
  > /backup/myapp_$(date +%Y%m%d).sql
```

## Backing Up All Databases

```bash
mysqlpump -u root -p \
  --all-databases \
  --default-parallelism=4 \
  > /backup/all_databases_$(date +%Y%m%d).sql
```

## Consistent Backup with Single Transaction

**Important:** When using `--single-transaction` with multiple parallel threads, each thread opens its own transaction at a potentially different point in time. This means cross-table consistency is not guaranteed. For a fully consistent snapshot, use `--default-parallelism=0` (single-threaded) with `--single-transaction`.

```bash
# Consistent but single-threaded backup
mysqlpump -u root -p \
  --default-parallelism=0 \
  --single-transaction \
  --all-databases \
  > /backup/all_databases_consistent.sql
```

## Routines and Events

Unlike `mysqldump`, `mysqlpump` includes stored routines and events by default. No extra flags are needed:

```bash
# Routines and events are included by default
mysqlpump -u root -p \
  --default-parallelism=4 \
  --all-databases \
  > /backup/all_databases_full.sql
```

To exclude them, use `--skip-routines` or `--skip-events`:

```bash
mysqlpump -u root -p \
  --default-parallelism=4 \
  --skip-routines \
  --skip-events \
  --all-databases \
  > /backup/all_databases_no_routines.sql
```

## Built-in Compression

`mysqlpump` can compress output natively without piping to gzip:

```bash
mysqlpump -u root -p \
  --default-parallelism=4 \
  --compress-output=LZ4 \
  --all-databases \
  > /backup/all_databases.lz4

# Or with ZLIB
mysqlpump -u root -p \
  --default-parallelism=4 \
  --compress-output=ZLIB \
  --all-databases \
  > /backup/all_databases.zlib
```

## Decompressing mysqlpump Output

Use the `lz4_decompress` and `zlib_decompress` utilities included with MySQL:

```bash
# Decompress LZ4 output
lz4_decompress /backup/all_databases.lz4 /backup/all_databases.sql

# Decompress ZLIB output
zlib_decompress /backup/all_databases.zlib /backup/all_databases.sql
```

## Excluding Specific Databases

```bash
mysqlpump -u root -p \
  --default-parallelism=4 \
  --exclude-databases=sys,test \
  --all-databases \
  > /backup/all_user_databases.sql
```

## Excluding Specific Tables

```bash
# Exclude large log tables from backup
mysqlpump -u root -p \
  --default-parallelism=4 \
  --exclude-tables=myapp.event_logs,myapp.debug_logs \
  myapp \
  > /backup/myapp_no_logs.sql
```

## Monitoring Backup Progress

`mysqlpump` prints progress output to stderr:

```text
Dump progress: 0/3 tables, 0/5437 rows
Dump progress: 0/6 tables, 3781/26784 rows
Dump progress: 0/9 tables, 8923/26784 rows
Dump completed in 3242 milliseconds
```

Redirect stderr to see progress while capturing stdout:

```bash
mysqlpump -u root -p myapp \
  > /backup/myapp.sql \
  2>/backup/mysqlpump_progress.log
```

## Restoring from a mysqlpump Backup

Restoration uses the standard `mysql` client (same as mysqldump output):

```bash
mysql -u root -p myapp < /backup/myapp_20260331.sql
```

## Summary

`mysqlpump` provides parallel database backups by processing multiple tables simultaneously, making it significantly faster than `mysqldump` for large databases. Use `--default-parallelism` to control thread count, `--compress-output=LZ4` for built-in compression, and `--exclude-tables` to skip large tables that don't need regular backing up. Monitor backup progress via stderr output and restore with the standard `mysql` client.
