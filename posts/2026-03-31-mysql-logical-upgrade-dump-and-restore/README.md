# How to Perform a Logical MySQL Upgrade Using Dump and Restore

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Upgrade, Logical Backup, mysqldump, Migration

Description: Upgrade MySQL to a new version using a logical dump-and-restore approach that exports all data, installs the new server, and reimports the data cleanly.

---

## When to Use Logical Upgrade

A logical upgrade exports your data as SQL statements using `mysqldump` or MySQL Shell's export utility, installs the new MySQL version fresh, and then imports the dump. This approach:
- Works across any version jump (e.g., 5.6 to 8.4 directly)
- Lets you review and fix incompatible schema before reimporting
- Is slower than in-place upgrade for large datasets but is more flexible
- Produces a clean data directory with no legacy file-format artifacts

## Step 1 - Export the Current Database

```bash
# Full logical dump with stored routines, triggers, and events
mysqldump -u root -p \
  --all-databases \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --set-gtid-purged=OFF \
  --result-file=/backup/logical-upgrade-$(date +%F).sql

# Verify dump size
ls -lh /backup/logical-upgrade-$(date +%F).sql
```

For large databases, use MySQL Shell's parallel dump for better performance:

```bash
mysqlsh root@localhost -- util dumpInstance /backup/dump-dir/ \
  --threads=8 \
  --consistent=true
```

## Step 2 - Review the Dump for Compatibility Issues

Before importing into the new version, scan for known incompatibilities:

```bash
# Check for reserved words used as identifiers (MySQL 8.0 added many)
grep -i "RANK\|ROW\|GROUPS\|SYSTEM\|LATERAL" /backup/logical-upgrade-$(date +%F).sql | head -30

# Check for zero dates
grep "0000-00-00" /backup/logical-upgrade-$(date +%F).sql | head -10
```

Fix zero dates in the dump before importing:

```bash
sed -i "s/'0000-00-00 00:00:00'/NULL/g" /backup/logical-upgrade-$(date +%F).sql
```

## Step 3 - Install the New MySQL Version

```bash
# Ubuntu: remove old version, install new
sudo apt-get remove mysql-server mysql-client
sudo apt-get install mysql-server-8.4

# Initialize fresh data directory
sudo systemctl start mysql

# Secure the installation
sudo mysql_secure_installation
```

## Step 4 - Configure the New Server

Before importing, apply permissive settings to ease migration:

```ini
[mysqld]
sql_mode = NO_ENGINE_SUBSTITUTION
local-infile = 1
foreign_key_checks = 0
```

Restart:

```bash
sudo systemctl restart mysql
```

## Step 5 - Import the Dump

```bash
mysql -u root -p < /backup/logical-upgrade-$(date +%F).sql 2>&1 | tee /tmp/import.log

# Check for errors
grep -i "error" /tmp/import.log
```

For MySQL Shell parallel import:

```bash
mysqlsh root@localhost -- util loadDump /backup/dump-dir/ \
  --threads=8 \
  --deferTableIndexes=all
```

## Step 6 - Post-Import Validation

```bash
# Verify table counts match source
mysql -u root -p -e "
  SELECT table_schema, COUNT(*) AS tables
  FROM information_schema.tables
  WHERE table_schema NOT IN ('information_schema','performance_schema','mysql','sys')
  GROUP BY table_schema;"

# Run table check
mysqlcheck -u root -p --all-databases --check
```

## Step 7 - Restore Strict Settings

```sql
SET GLOBAL sql_mode = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
SET GLOBAL foreign_key_checks = 1;
```

Update `mysqld.cnf` to persist these settings, then restart.

## Summary

A logical MySQL upgrade using dump and restore gives you full control over the migration: you can inspect the SQL, fix incompatibilities, and import into a clean server. It is slower than an in-place upgrade but is the safest approach for large version jumps and guarantees a clean starting state on the new version.
