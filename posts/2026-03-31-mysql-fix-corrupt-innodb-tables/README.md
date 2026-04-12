# How to Fix Corrupt InnoDB Tables in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Corruption, Recovery, Tablespace

Description: Recover from InnoDB table corruption using force recovery mode, CHECK TABLE, and data export techniques to restore table access and extract data.

---

InnoDB table corruption can occur after a server crash, hardware failure, or filesystem error. Symptoms include errors like `InnoDB: Database page corruption on disk or a failed file read`, `InnoDB: Unable to read tablespace`, or MySQL refusing to start entirely.

## Check for Corruption

Run a table check to identify corrupted tables:

```sql
CHECK TABLE orders;
```

Review the MySQL error log for InnoDB corruption messages:

```bash
sudo tail -500 /var/log/mysql/error.log | grep -i "corrupt\|crash\|recovery"
```

## Step 1: Try Normal InnoDB Recovery

If MySQL starts, attempt to dump the corrupted table immediately:

```bash
mysqldump -u root -p --single-transaction mydb orders > orders_backup.sql
```

If the dump succeeds, drop and recreate the table:

```sql
DROP TABLE orders;
-- Recreate schema
-- Re-import data
```

## Step 2: Force Recovery Mode

If MySQL will not start or the table is inaccessible, use `innodb_force_recovery`:

```text
[mysqld]
innodb_force_recovery = 1
```

Start MySQL and try to access the table. If it fails, increment the value up to 6:

```text
innodb_force_recovery = 2
# or 3, 4, 5, 6 if lower levels fail
```

Recovery levels and what they allow:
- 1: Ignore corrupt pages
- 2: Prevent background threads from running
- 3: Do not roll back transactions
- 4: Prevent insert buffer merges
- 5: Do not look at undo logs
- 6: Do not roll forward from redo logs

## Step 3: Dump Data in Force Recovery Mode

Once MySQL starts in force recovery mode, dump all data immediately:

```bash
# Dump individual table
mysqldump -u root -p --no-tablespaces mydb orders > orders_recovery.sql

# Dump entire database
mysqldump -u root -p --no-tablespaces --databases mydb > mydb_recovery.sql
```

## Step 4: Rebuild the Database

After extracting the data:

```bash
# Stop MySQL
sudo systemctl stop mysql

# Remove innodb_force_recovery from my.cnf
# Remove InnoDB files and old database directories
sudo rm /var/lib/mysql/ib_logfile*
sudo rm -rf '/var/lib/mysql/#innodb_redo/'
sudo rm /var/lib/mysql/ibdata1
sudo rm -rf /var/lib/mysql/mydb/

# Start MySQL to let it initialize fresh InnoDB files
sudo systemctl start mysql

# Recreate the database and import data
mysql -u root -p < mydb_recovery.sql
```

## Prevent Future Corruption

Enable the InnoDB doublewrite buffer (on by default in most versions):

```sql
SHOW VARIABLES LIKE 'innodb_doublewrite';
```

Configure scheduled backups and enable binary logging:

```text
[mysqld]
log_bin = mysql-bin
innodb_flush_log_at_trx_commit = 1
sync_binlog = 1
```

## Summary

InnoDB corruption recovery follows a priority order: try dumping the table first, then use `innodb_force_recovery` to get MySQL running, extract the data, and rebuild. Always restore `innodb_force_recovery` to 0 (or remove it) before normal operation. The most important practice is maintaining regular verified backups so corruption recovery means restoring a backup rather than performing risky file-level operations.
