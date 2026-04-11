# How to Respond to MySQL Data Corruption Incidents

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Data Corruption, InnoDB, Recovery, Incident Response

Description: Step-by-step procedures for detecting, containing, and recovering from MySQL data corruption incidents to minimize data loss and downtime.

---

## Recognizing Data Corruption

Data corruption in MySQL manifests as errors like `Table './db/tablename' is marked as crashed`, `InnoDB: Database page corruption on disk`, or checksum mismatch errors in the MySQL error log. Applications may report unexpected query failures or return incorrect data.

Check the MySQL error log immediately:

```bash
sudo tail -100 /var/log/mysql/error.log | grep -iE "(corrupt|crash|checksum|page|error)"
```

## Initial Assessment

Check the health of tables using `CHECK TABLE`:

```sql
-- Check a specific table
CHECK TABLE orders;

-- Check all tables in a database
SELECT CONCAT('CHECK TABLE ', table_name, ';')
FROM information_schema.TABLES
WHERE table_schema = 'myapp';
```

The output will show `OK` for healthy tables or specific error messages for corrupted ones. For InnoDB tables, also check the tablespace:

```sql
SHOW ENGINE INNODB STATUS\G
```

Look for `FILE I/O` errors or page corruption messages in the output.

## Immediate Containment

If corruption is detected, prevent further writes to the affected table to avoid compounding the problem:

```sql
-- Make the table read-only temporarily
FLUSH TABLES orders WITH READ LOCK;
```

Take a backup of the corrupted table before attempting any repair:

```bash
mysqldump --single-transaction --quick myapp orders > /backup/orders_corrupted_$(date +%Y%m%d%H%M%S).sql
```

## Recovery Options

### Option 1 - Repair Table (MyISAM only)

For MyISAM tables, `REPAIR TABLE` can fix many types of corruption:

```sql
REPAIR TABLE legacy_table;
```

InnoDB tables do not support `REPAIR TABLE`. For InnoDB, recovery requires different approaches.

### Option 2 - Restore from Backup

The safest recovery for InnoDB corruption is restoring from the most recent clean backup:

```bash
# Restore the backup (MySQL must be running)
mysql -u root -p myapp < /backup/orders_2026_03_30.sql
```

### Option 3 - InnoDB Force Recovery

If you cannot restore from backup and need to extract data from a corrupted InnoDB tablespace, use force recovery mode:

```text
# In /etc/mysql/mysql.conf.d/mysqld.cnf
[mysqld]
innodb_force_recovery = 1
```

Start with level 1 and increase incrementally (up to 6) until MySQL starts. In MySQL 8.0, InnoDB prevents INSERT, UPDATE, and DELETE operations at any non-zero recovery level, so you should only dump and restore:

```bash
# Dump all data at the force recovery level
mysqldump --all-databases > /backup/emergency_dump.sql
```

## Post-Recovery Validation

After recovery, validate data integrity:

```sql
-- Check row counts match expected values
SELECT COUNT(*) FROM orders;
SELECT COUNT(*) FROM order_items;

-- Verify referential integrity
SELECT COUNT(*) FROM order_items oi
LEFT JOIN orders o ON oi.order_id = o.id
WHERE o.id IS NULL;
```

Compare results against your last known-good metrics or a replica if available.

## Root Cause Investigation

Common causes of MySQL data corruption:
- Hardware failures (disk I/O errors, RAM faults)
- Unclean shutdowns (power loss without `innodb_flush_log_at_trx_commit = 1`)
- Bug in MySQL version or storage driver
- Filesystem errors

Check system logs for hardware errors:

```bash
dmesg | grep -iE "(error|fail|corrupt|ata|sda|nvme)"
```

## Prevention

- Enable `innodb_flush_log_at_trx_commit = 1` for durability
- Use UPS or similar protection against power loss
- Run regular backups and test restoration procedures quarterly
- Monitor disk health with tools like `smartctl`
- Enable MySQL checksums: `innodb_checksum_algorithm = crc32`

## Summary

Responding to MySQL data corruption requires immediate assessment using `CHECK TABLE` and error log analysis, followed by containment to prevent further damage. Recovery options range from `REPAIR TABLE` for MyISAM to restoring from backup or using InnoDB force recovery. Prevention relies on proper durability settings, regular tested backups, and hardware health monitoring.
