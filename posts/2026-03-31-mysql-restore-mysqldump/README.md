# How to Restore MySQL from a mysqldump Backup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Restore, Backup, mysqldump, Database Recovery

Description: Learn how to restore MySQL databases from mysqldump backup files, including full restores, single-database restores, single-table restores, and partial data recovery.

---

## How mysqldump Restore Works

A mysqldump file is a plain SQL script containing `CREATE TABLE` and `INSERT` statements. Restoring it means executing those statements against a MySQL server using the `mysql` command-line client or a similar tool.

```mermaid
flowchart LR
    F["mysqldump .sql file"]
    C["mysql client"]
    M["MySQL Server"]
    D["Restored Database"]

    F -- "pipe / redirect" --> C
    C -- "executes SQL" --> M
    M --> D
```

## Basic Restore

### Restore All Databases

If the backup was created with `--all-databases`:

```bash
mysql -u root -p < /backups/all_databases_20260331.sql
```

### Restore a Specific Database

If the backup was created with `--databases myapp_db`:

```bash
mysql -u root -p < /backups/myapp_db_20260331.sql
```

### Restore to a Specific Database (no --databases flag in backup)

If the backup contains only table data (no `CREATE DATABASE`/`USE` statements), specify the target database:

```bash
# Create the database first
mysql -u root -p -e "CREATE DATABASE myapp_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Restore into the database
mysql -u root -p myapp_db < /backups/myapp_db_20260331.sql
```

## Restore from a Compressed Backup

Decompress and pipe in one command:

```bash
# gzip compressed
gunzip -c /backups/myapp_db_20260331.sql.gz | mysql -u root -p myapp_db

# Or using zcat
zcat /backups/myapp_db_20260331.sql.gz | mysql -u root -p myapp_db
```

## Restore with Progress Monitoring

For large backups, use `pv` (pipe viewer) to monitor progress:

```bash
# Install pv
sudo apt-get install -y pv

# Restore with progress bar
pv /backups/myapp_db_20260331.sql | mysql -u root -p myapp_db

# Compressed restore with progress
pv /backups/myapp_db_20260331.sql.gz | gunzip | mysql -u root -p myapp_db
```

## Restore a Single Table

If the backup is a single-database dump, extract a specific table and restore it:

```bash
# Extract the CREATE TABLE and INSERT statements for 'orders'
grep -A 10000 "Table structure for table .orders." /backups/myapp_db_20260331.sql \
    | grep -B 10000 "Table structure for table .customers." \
    | head -n -1 > /tmp/orders_restore.sql

# Restore to the database
mysql -u root -p myapp_db < /tmp/orders_restore.sql
```

Alternatively, use `--tables` flag when the backup was created per-table:

```bash
mysql -u root -p myapp_db < /backups/orders_20260331.sql
```

## Restore Over SSH

Restore a backup from a remote backup server directly:

```bash
ssh backup-server "cat /backups/myapp_db_20260331.sql.gz" | \
    gunzip | mysql -u root -p myapp_db
```

## Restore Options and Performance Tuning

Speed up large restores by temporarily adjusting MySQL settings:

```sql
-- Before restoring
SET GLOBAL innodb_flush_log_at_trx_commit = 0;
SET GLOBAL sync_binlog = 0;
SET GLOBAL foreign_key_checks = 0;
SET GLOBAL unique_checks = 0;
```

Restore the backup, then restore settings:

```sql
-- After restoring
SET GLOBAL innodb_flush_log_at_trx_commit = 1;
SET GLOBAL sync_binlog = 1;
SET GLOBAL foreign_key_checks = 1;
SET GLOBAL unique_checks = 1;
```

Alternatively, add these directives to the beginning of the SQL file before importing:

```bash
{
  echo "SET GLOBAL innodb_flush_log_at_trx_commit=0;"
  echo "SET GLOBAL sync_binlog=0;"
  echo "SET foreign_key_checks=0;"
  echo "SET unique_checks=0;"
  cat /backups/myapp_db_20260331.sql
  echo "SET GLOBAL innodb_flush_log_at_trx_commit=1;"
  echo "SET GLOBAL sync_binlog=1;"
  echo "SET foreign_key_checks=1;"
  echo "SET unique_checks=1;"
} | mysql -u root -p myapp_db
```

## Verify the Restore

After restoring, verify data integrity:

```sql
USE myapp_db;

-- Check tables exist
SHOW TABLES;

-- Check row counts
SELECT TABLE_NAME, TABLE_ROWS
FROM   information_schema.TABLES
WHERE  TABLE_SCHEMA = 'myapp_db'
ORDER BY TABLE_NAME;

-- Spot-check critical data
SELECT COUNT(*) FROM orders;
SELECT MAX(created_at) FROM orders;
```

## Partial Data Recovery

To restore a single row or range of rows, extract just the needed INSERT statements:

```bash
# Extract INSERT statements for a specific user
grep "INSERT INTO .users. VALUES.*'alice@example.com'" \
    /backups/myapp_db_20260331.sql > /tmp/recover_alice.sql

mysql -u root -p myapp_db < /tmp/recover_alice.sql
```

## Common Issues and Fixes

### Error 1005: Cannot create table (foreign key constraint)

Disable foreign key checks during restore:

```bash
mysql -u root -p --init-command="SET foreign_key_checks=0;" \
    myapp_db < /backups/myapp_db_20260331.sql
```

### Error 1049: Unknown database

Create the database before restoring:

```sql
CREATE DATABASE myapp_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Large Files Causing Memory Issues

For very large backups, use `--max_allowed_packet`:

```bash
mysql -u root -p --max_allowed_packet=512M myapp_db < /backups/large_backup.sql
```

## Best Practices

- Always test restores on a staging environment before performing in production.
- Verify the backup file is complete before starting a restore (check the last few lines for `-- Dump completed`).
- Disable foreign key checks when restoring to avoid ordering issues.
- Temporarily set `innodb_flush_log_at_trx_commit=0` and `sync_binlog=0` to speed up large restores.
- Keep a restore runbook with the exact commands needed for your environment.

## Summary

Restoring from a mysqldump backup is straightforward: pipe the SQL file into the `mysql` client targeting the correct database. For compressed backups, decompress on the fly with `gunzip -c`. Speed up large restores by temporarily disabling foreign key checks and InnoDB durability settings. Always verify the restore by checking table existence and row counts.
