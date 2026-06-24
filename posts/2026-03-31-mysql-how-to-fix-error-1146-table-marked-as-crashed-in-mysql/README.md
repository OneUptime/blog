# How to Fix ERROR 1146 Table Marked as Crashed in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Error Handling, Troubleshooting, Table Repair

Description: Learn how to diagnose and repair MySQL tables affected by ERROR 1146 'Table is marked as crashed' using CHECK TABLE and REPAIR TABLE.

---

## What is ERROR 1146 (Table Crashed)

The "table is marked as crashed" error in MySQL is ERROR 1194:

```text
ERROR 1194 (HY000): Table 'table_name' is marked as crashed and should be repaired
```

In cases of severe corruption, you may also see ERROR 1146 if the table files are damaged enough that MySQL cannot recognize the table:

```text
ERROR 1146 (42S02): Table 'database.table_name' doesn't exist
```

Table corruption most commonly affects MyISAM tables and can be caused by:
- Unexpected server crash or power failure mid-write
- Disk full conditions
- Hardware failures
- Bug in MySQL itself

InnoDB tables can also become corrupted but have better crash recovery mechanisms.

## Step 1 - Check Which Tables Are Corrupted

```sql
CHECK TABLE your_table;
```

Output example:

```text
+------------------+-------+----------+--------------------------------------------+
| Table            | Op    | Msg_type | Msg_text                                   |
+------------------+-------+----------+--------------------------------------------+
| mydb.orders      | check | error    | Table is marked as crashed                 |
+------------------+-------+----------+--------------------------------------------+
```

Check all tables in a database:

```sql
SELECT CONCAT('CHECK TABLE `', table_name, '`;') AS check_stmt
FROM information_schema.tables
WHERE table_schema = 'your_database'
  AND engine = 'MyISAM';
```

## Step 2 - Repair a MyISAM Table

```sql
REPAIR TABLE your_table;
```

Output after successful repair:

```text
+------------------+--------+----------+----------+
| Table            | Op     | Msg_type | Msg_text |
+------------------+--------+----------+----------+
| mydb.orders      | repair | status   | OK       |
+------------------+--------+----------+----------+
```

For extended repair (slower but more thorough):

```sql
REPAIR TABLE your_table EXTENDED;
```

To recreate the .MYI index file from the .frm table definition when the index is missing or corrupted:

```sql
REPAIR TABLE your_table USE_FRM;
```

## Step 3 - Repair Using myisamchk (Offline)

If the table cannot be repaired while MySQL is running, stop the server and use `myisamchk`:

```bash
# Stop MySQL
sudo systemctl stop mysql

# Navigate to the data directory
cd /var/lib/mysql/your_database

# Check the table
myisamchk -c orders.MYI

# Repair
myisamchk -r orders.MYI

# For severe corruption
myisamchk -r -f orders.MYI

# Restart MySQL
sudo systemctl start mysql
```

## Fixing InnoDB Corruption

InnoDB tables use automatic crash recovery. If InnoDB fails to recover, try forcing recovery:

Add to `/etc/mysql/my.cnf`:

```text
[mysqld]
innodb_force_recovery = 1
```

Start MySQL, export the table:

```bash
mysqldump -u root -p your_database corrupted_table > corrupted_table_backup.sql
```

Increase `innodb_force_recovery` to 2, 3, up to 6 if needed. Then:

```sql
DROP TABLE corrupted_table;
```

Remove the `innodb_force_recovery` setting, restart MySQL, and reimport:

```bash
mysql -u root -p your_database < corrupted_table_backup.sql
```

## Automated Repair Script

```bash
#!/bin/bash
DB="your_database"
USER="root"
PASS="your_password"

mysql -u "$USER" -p"$PASS" -e "
  SELECT CONCAT('REPAIR TABLE \`', table_name, '\`;')
  FROM information_schema.tables
  WHERE table_schema = '$DB'
    AND engine = 'MyISAM'
" | grep -v "CONCAT" | mysql -u "$USER" -p"$PASS" "$DB"
```

## Preventing Future Corruption

1. Use InnoDB instead of MyISAM for better crash recovery.
2. Enable binary logging for point-in-time recovery.
3. Schedule regular backups with `mysqldump` or Percona XtraBackup.
4. Use `innodb_flush_log_at_trx_commit = 1` for ACID compliance.

```sql
-- Convert MyISAM to InnoDB
ALTER TABLE your_table ENGINE = InnoDB;
```

## Summary

Corrupted MySQL tables can often be repaired with `REPAIR TABLE` for MyISAM or `myisamchk` when the server is offline. For InnoDB, use `innodb_force_recovery` to export data before dropping and reimporting. The best long-term fix is to convert critical tables to InnoDB, which has superior crash recovery compared to MyISAM.
