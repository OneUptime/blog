# How to Upgrade from MySQL 5.7 to MySQL 8.0

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Upgrade, MySQL 5.7, MySQL 8.0, Migration

Description: A step-by-step guide to upgrading from MySQL 5.7 to MySQL 8.0 safely, including pre-upgrade checks, compatibility fixes, and post-upgrade validation.

---

## Key Differences Between MySQL 5.7 and 8.0

MySQL 8.0 introduces significant changes:

- New data dictionary replaces FRM files
- Default character set changed from `latin1` to `utf8mb4`
- Default authentication plugin changed from `mysql_native_password` to `caching_sha2_password`
- Several reserved words added
- Query cache removed entirely
- `GROUP BY` implicit sorting removed
- `ZEROFILL` deprecated
- JSON improvements and new functions

## Step 1: Run the Pre-Upgrade Check Tool

MySQL Shell provides an upgrade compatibility checker:

```bash
# Install MySQL Shell
apt-get install mysql-shell

# Run upgrade checker
mysqlsh --user=root --password --host=localhost \
  -- util checkForServerUpgrade \
  --targetVersion=8.0.35 \
  --outputFormat=TEXT
```

Or using the older `mysqlcheck` approach (less comprehensive):

```bash
mysqlcheck -u root -p --all-databases --check-upgrade
```

## Step 2: Resolve Common Pre-Upgrade Issues

### Fix Partitioned Tables Not Using InnoDB

```sql
-- Find non-InnoDB partitioned tables
SELECT table_schema, table_name, engine
FROM information_schema.tables
WHERE create_options LIKE '%partitioned%'
  AND engine != 'InnoDB';

-- Convert to InnoDB
ALTER TABLE mydb.mytable ENGINE = InnoDB;
```

### Fix Tables Using Deprecated Character Sets

```sql
-- Find tables using latin1
SELECT table_schema, table_name, table_collation
FROM information_schema.tables
WHERE table_collation LIKE 'latin1%';

-- Convert
ALTER TABLE mydb.mytable CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Fix Reserved Word Conflicts

MySQL 8.0 adds new reserved words. Find columns using them:

```sql
SELECT table_schema, table_name, column_name
FROM information_schema.columns
WHERE column_name IN ('RANK', 'GROUPS', 'SYSTEM', 'CUME_DIST',
  'DENSE_RANK', 'EMPTY', 'FIRST_VALUE', 'GROUPING', 'JSON_TABLE',
  'LAG', 'LAST_VALUE', 'LATERAL', 'LEAD', 'NTH_VALUE', 'NTILE',
  'OF', 'OVER', 'PERCENT_RANK', 'RECURSIVE', 'ROW_NUMBER', 'ROWS', 'WINDOW');
```

Rename conflicting identifiers (e.g., `RANK`, `GROUPS`, `SYSTEM`):

```sql
ALTER TABLE orders CHANGE COLUMN `rank` `order_rank` INT;
```

## Step 3: Take a Full Backup

```bash
mysqldump -u root -p --all-databases --single-transaction \
  --flush-logs --master-data=2 \
  > /backup/mysql57-full-backup-$(date +%Y%m%d).sql

# Verify the backup
wc -l /backup/mysql57-full-backup-*.sql
```

## Step 4: Perform the In-Place Upgrade

### On Ubuntu/Debian

```bash
# Remove 5.7 packages (keep data directory)
apt-get remove mysql-server mysql-client

# Add MySQL 8.0 repository
wget https://dev.mysql.com/get/mysql-apt-config_0.8.28-1_all.deb
dpkg -i mysql-apt-config_0.8.28-1_all.deb
apt-get update

# Install MySQL 8.0
apt-get install mysql-server

# MySQL 8.0 automatically upgrades the data dictionary on first start
systemctl start mysql
```

### On RHEL/CentOS

```bash
# Remove 5.7
yum remove mysql-community-server

# Install 8.0 repository
yum install https://dev.mysql.com/get/mysql80-community-release-el7-9.noarch.rpm
yum install mysql-community-server

systemctl start mysqld
```

## Step 5: Post-Upgrade Steps

Run `mysql_upgrade` if not done automatically (MySQL 5.7 path):

```bash
mysql_upgrade -u root -p
```

In MySQL 8.0, the upgrade runs automatically. Verify:

```sql
SELECT version();
SHOW VARIABLES LIKE 'version';
```

## Step 6: Fix Authentication for Old Clients

MySQL 8.0 uses `caching_sha2_password` by default, which older clients may not support:

```sql
-- Check which users still use the old plugin
SELECT user, host, plugin FROM mysql.user;

-- Update specific users to use the old plugin temporarily
ALTER USER 'appuser'@'%' IDENTIFIED WITH mysql_native_password BY 'password';

-- Or set the default globally (not recommended for new installs)
-- default_authentication_plugin = mysql_native_password
```

## Step 7: Validate Application Behavior

```bash
# Run application integration tests
npm test  # or pytest, mvn test, etc.

# Monitor error log for warnings
tail -f /var/log/mysql/error.log
```

## Summary

Upgrading from MySQL 5.7 to 8.0 requires running the pre-upgrade compatibility checker, resolving reserved word conflicts and character set issues, taking a full backup, performing the in-place upgrade, and validating application compatibility with the new default authentication plugin. The MySQL Shell upgrade checker automates most of the compatibility analysis.
