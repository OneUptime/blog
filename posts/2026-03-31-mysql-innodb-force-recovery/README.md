# How to Use innodb_force_recovery in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Crash Recovery, Administration, Troubleshooting

Description: Learn how to use innodb_force_recovery in MySQL to start a damaged InnoDB instance and recover data when normal crash recovery fails.

---

`innodb_force_recovery` is an emergency setting that forces MySQL to start even when InnoDB detects corruption or encounters errors it would normally refuse to bypass. It allows you to dump data out of a damaged database before rebuilding. Use it only as a last resort when normal startup fails.

## Understanding Force Recovery Levels

The setting accepts values from 0 to 6, with each level progressively more aggressive:

| Level | Behavior |
| --- | --- |
| 0 | Normal operation (no force recovery) |
| 1 | Skip corrupted pages; continue recovery |
| 2 | Prevent master thread and purge thread from running |
| 3 | Skip transaction rollbacks during recovery |
| 4 | Skip insert buffer merge operations |
| 5 | Do not look at undo logs at startup; treat incomplete transactions as committed (dangerous) |
| 6 | Skip redo log roll-forward during recovery; very dangerous |

Levels 4, 5, and 6 can result in data appearing inconsistent or missing. Always dump data immediately after achieving startup at these levels.

## When to Use innodb_force_recovery

Normal startup failure symptoms that may require force recovery:

```bash
# Look for these errors in the MySQL error log
sudo grep -E "corruption|crashed|Cannot open|ib_logfile" /var/log/mysql/error.log
```

```text
[ERROR] InnoDB: Plugin initialization aborted with error Generic error
[ERROR] InnoDB: Could not find a valid tablespace file for 'mydb/orders'
[ERROR] InnoDB: Corrupted page at file 'ibdata1', offset 65536
```

## Enabling Force Recovery

Add the setting to `my.cnf` and restart MySQL:

```text
[mysqld]
innodb_force_recovery=1
```

Start with level 1 and increase until MySQL starts:

```bash
# Attempt restart at each level
sudo systemctl start mysql

# If it fails, increase to level 2, then 3, etc.
```

```sql
-- Once MySQL starts, verify the setting
SHOW VARIABLES LIKE 'innodb_force_recovery';
```

## Dumping Data After Achieving Startup

Once MySQL starts under force recovery, immediately export all data. Do not perform writes:

```bash
# Export all databases
mysqldump \
    --all-databases \
    --single-transaction \
    --skip-lock-tables \
    --skip-add-locks \
    --no-tablespaces \
    > /backup/emergency_dump_$(date +%Y%m%d).sql
```

If some tables are corrupted and cause dump failures, dump databases one at a time:

```bash
# List all databases first
mysql -e "SHOW DATABASES;" | grep -v -E "Database|information_schema|performance_schema"

# Dump each database separately
for db in mydb app_db; do
    mysqldump --single-transaction "$db" > "/backup/${db}_emergency.sql" 2>&1
done
```

## Rebuilding After Force Recovery

After exporting data, rebuild a clean MySQL instance:

```bash
# Stop MySQL
sudo systemctl stop mysql

# Back up and remove the corrupted data directory
sudo mv /var/lib/mysql /var/lib/mysql.bak

# Create a fresh empty data directory
sudo mkdir /var/lib/mysql
sudo chown mysql:mysql /var/lib/mysql

# Remove force recovery setting from my.cnf
sudo sed -i '/innodb_force_recovery/d' /etc/mysql/mysql.conf.d/mysqld.cnf

# Initialize a clean data directory
sudo mysqld --initialize --user=mysql

# Start MySQL and restore (use the temporary root password from --initialize output)
sudo systemctl start mysql
mysql -u root -p < /backup/emergency_dump_$(date +%Y%m%d).sql
```

## Safety Precautions

```text
[mysqld]
# NEVER combine force recovery with writes
innodb_force_recovery=3
# Consider making the instance read-only during recovery
read_only=ON
super_read_only=ON
```

With levels 3 and above, data may be inconsistent. Applications should be kept offline during the recovery process.

## Summary

`innodb_force_recovery` is an emergency tool for starting MySQL when InnoDB cannot complete normal crash recovery. Start at level 1 and increment until MySQL boots. Immediately dump all data with `mysqldump`, then rebuild a clean instance and restore from the dump. Never run applications against a database in force recovery mode - data integrity is not guaranteed above level 0.
