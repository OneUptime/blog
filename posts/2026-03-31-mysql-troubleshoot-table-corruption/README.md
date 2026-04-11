# How to Troubleshoot MySQL Table Corruption

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Corruption, InnoDB, Repair, Troubleshooting

Description: Learn how to detect and repair MySQL table corruption for InnoDB and MyISAM tables using CHECK TABLE, mysqlcheck, and InnoDB recovery modes.

---

## Recognizing Table Corruption

Corruption symptoms include query errors, server crashes, or error log entries such as:

```text
InnoDB: Database page corruption on disk or a failed file read of page
InnoDB: Assertion failure in file row0sel.cc
ERROR 1194 (HY000): Table 'orders' is marked as crashed and should be repaired
```

Check the MySQL error log first:

```bash
tail -200 /var/log/mysql/error.log | grep -iE "corrupt|crash|error"
```

## Checking Tables for Errors

### CHECK TABLE

Run `CHECK TABLE` to verify table integrity:

```sql
CHECK TABLE orders;
CHECK TABLE orders EXTENDED;
```

The output includes a status column. `OK` means no corruption. `Error` or `Warning` lines indicate problems.

### mysqlcheck Command-Line Tool

For checking all tables in a database without logging into MySQL:

```bash
mysqlcheck -u root -p --check myapp_db

# Check all databases
mysqlcheck -u root -p --check --all-databases
```

## Repairing MyISAM Tables

MyISAM tables can often be repaired in place:

```sql
REPAIR TABLE myisam_table;
REPAIR TABLE myisam_table EXTENDED;
```

Or using `myisamchk` when MySQL is stopped:

```bash
myisamchk -r /var/lib/mysql/myapp_db/orders.MYI
```

## Repairing InnoDB Tables

InnoDB does not support `REPAIR TABLE`. Instead, use the following approaches:

### Option 1: Dump and Restore

If the table is still accessible despite corruption, dump and reimport it:

```bash
mysqldump -u root -p myapp_db orders > orders_backup.sql
mysql -u root -p myapp_db -e "DROP TABLE orders;"
mysql -u root -p myapp_db < orders_backup.sql
```

### Option 2: InnoDB Recovery Mode

If MySQL cannot start due to corruption, enable forced recovery mode in `my.cnf`:

```bash
# /etc/mysql/mysql.conf.d/mysqld.cnf
[mysqld]
innodb_force_recovery = 1
```

Start with level 1 and increase if needed (max 6). Higher levels skip more checks but risk data loss:

- Level 1: Ignore corrupt pages and let the server run
- Level 3: Skip transaction rollback
- Level 5: Do not look at undo logs
- Level 6: Do not do the redo log roll-forward

Once MySQL starts, dump all tables immediately:

```bash
mysqldump -u root -p --all-databases > full_backup.sql
```

Then reset `innodb_force_recovery = 0`, drop the corrupted database, recreate it, and restore from the dump.

### Option 3: Export Individual Tables

If only specific tables are corrupted:

```sql
-- With innodb_force_recovery = 1
SELECT * INTO OUTFILE '/tmp/orders_export.csv'
FIELDS TERMINATED BY ','
FROM orders;
```

## Preventing Future Corruption

```bash
# Enable the InnoDB doublewrite buffer (default ON)
innodb_doublewrite = ON

# Use O_DIRECT to avoid double buffering with OS cache
innodb_flush_method = O_DIRECT

# Enable checksums
innodb_checksum_algorithm = crc32
```

Also ensure the server has a UPS, runs `fsck` on crash recovery, and avoids killing `mysqld` with `kill -9`.

## Summary

Detect MySQL table corruption with `CHECK TABLE` or `mysqlcheck`, then check the error log for InnoDB messages. MyISAM tables support `REPAIR TABLE` directly. For InnoDB, dump and restore the table when accessible, or use `innodb_force_recovery` to start the server and extract data when MySQL cannot start cleanly. Prevent corruption by enabling checksums, using O_DIRECT flush method, and avoiding abrupt server shutdowns.
