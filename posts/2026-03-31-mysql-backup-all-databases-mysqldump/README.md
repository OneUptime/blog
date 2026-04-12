# How to Back Up All MySQL Databases with mysqldump

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Backup, mysqldump, Database, Recovery

Description: Learn how to back up all MySQL databases at once using mysqldump with the --all-databases flag, including tips for consistent backups and scheduling.

---

Backing up all MySQL databases at once is a common requirement for disaster recovery. The `mysqldump` tool provides the `--all-databases` flag to export every database on a server into a single SQL file. This approach is straightforward but requires careful handling of flags to ensure backup consistency, especially on production systems with active writes.

## Basic All-Databases Backup

```bash
mysqldump -u root -p --all-databases > all_databases_backup.sql
```

This creates a single `.sql` file containing `CREATE DATABASE`, `USE`, `CREATE TABLE`, and `INSERT` statements for every database on the server.

## Creating a Consistent Backup (InnoDB)

For InnoDB tables, use `--single-transaction` to get a consistent snapshot without locking tables:

```bash
mysqldump -u root -p \
  --all-databases \
  --single-transaction \
  --quick \
  --lock-tables=false \
  > /backup/all_databases_$(date +%Y%m%d_%H%M%S).sql
```

`--quick` streams rows one at a time instead of buffering the entire table in memory - essential for large databases.

## Including Stored Procedures and Events

By default, `mysqldump` does not include routines or events (only triggers are included by default). Add these flags to get a complete backup:

```bash
mysqldump -u root -p \
  --all-databases \
  --single-transaction \
  --routines \
  --events \
  --triggers \
  > /backup/all_databases_full.sql
```

## Backing Up with Replication Coordinates

For use in replica provisioning, capture binary log coordinates:

```bash
mysqldump -u root -p \
  --all-databases \
  --single-transaction \
  --master-data=2 \
  > /backup/all_databases_with_binlog.sql
```

`--master-data=2` adds a commented `CHANGE MASTER TO` statement at the top of the dump with the binary log position.

## Excluding System Databases

To back up only user databases (skip `information_schema`, `performance_schema`, `sys`, `mysql`):

```bash
#!/bin/bash
MYSQL_USER="root"
MYSQL_PASS="password"
BACKUP_DIR="/backup/mysql"
DATE=$(date +%Y%m%d_%H%M%S)

# Get list of user databases
DATABASES=$(mysql -u"${MYSQL_USER}" -p"${MYSQL_PASS}" \
  -e "SELECT schema_name FROM information_schema.schemata
      WHERE schema_name NOT IN
      ('information_schema','performance_schema','sys','mysql');" \
  --silent --skip-column-names)

for DB in $DATABASES; do
  mysqldump -u"${MYSQL_USER}" -p"${MYSQL_PASS}" \
    --single-transaction \
    --databases "$DB" \
    > "${BACKUP_DIR}/${DB}_${DATE}.sql"
  echo "Backed up: $DB"
done
```

## Compressing the Backup

```bash
mysqldump -u root -p \
  --all-databases \
  --single-transaction | gzip > /backup/all_databases_$(date +%Y%m%d).sql.gz
```

## Verifying Backup Integrity

```bash
# Check the file is not empty and ends properly
tail -5 /backup/all_databases_backup.sql
```

A valid dump ends with `-- Dump completed on YYYY-MM-DD HH:MM:SS`.

## Restoring from an All-Databases Backup

```bash
mysql -u root -p < /backup/all_databases_backup.sql
```

## Summary

Use `mysqldump --all-databases` with `--single-transaction --quick --routines --events --triggers` for a comprehensive, consistent backup of all MySQL databases. Compress output with `gzip` to reduce storage, and always verify backup files by checking they end with the completion comment. Schedule backups with cron and store files off-server for proper disaster recovery coverage.
