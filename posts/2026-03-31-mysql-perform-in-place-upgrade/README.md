# How to Perform an In-Place MySQL Upgrade

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Upgrade, In-Place Upgrade, Database Administration, Migration

Description: Perform an in-place MySQL upgrade by replacing server binaries and letting MySQL's automatic upgrade process handle schema and dictionary updates.

---

## What Is an In-Place Upgrade?

An in-place upgrade replaces the MySQL server binaries while keeping the existing data directory. MySQL's upgrade mechanism then updates system tables, the data dictionary, and any required internal structures on first start. This approach is faster than a logical (dump and restore) upgrade but requires the data files to be compatible with the new version.

In-place upgrades are supported within certain version boundaries:
- MySQL 5.6 to 5.7
- MySQL 5.7 to 8.0
- MySQL 8.0.x to 8.0.y (any point release)
- MySQL 8.0 to 8.4

In-place upgrades are NOT supported across major boundaries (e.g., 5.6 directly to 8.0).

## Pre-Upgrade Preparation

```bash
# 1. Full backup
mysqldump -u root -p --all-databases --single-transaction \
  --routines --triggers --events > /backup/pre-upgrade-$(date +%F).sql

# 2. Record current configuration
mysqld --verbose --help 2>/dev/null | grep -A1 "Default options" > /backup/current-config.txt

# 3. Run compatibility check (MySQL Shell)
mysqlsh root@localhost -- util checkForServerUpgrade --outputFormat=TEXT
```

## Stopping the Current Server

```bash
sudo systemctl stop mysql
```

Verify it is stopped:

```bash
sudo systemctl status mysql
```

## Replacing the Binaries

On Ubuntu/Debian:

```bash
sudo apt-get install mysql-server-8.0
# Or to a specific point release:
sudo apt-get install mysql-server=8.0.36-0ubuntu0.22.04.1
```

On RHEL/CentOS:

```bash
sudo yum install mysql-community-server-8.0.36
```

## Starting the New Server

```bash
sudo systemctl start mysql
```

MySQL detects the version mismatch and runs the upgrade automatically. Monitor the error log:

```bash
sudo tail -f /var/log/mysql/error.log
```

Look for lines like:

```text
[System] [MY-013381] [Server] Server upgrade from '50700' to '80036' started.
[System] [MY-013381] [Server] Server upgrade from '50700' to '80036' completed.
```

## Running mysql_upgrade (Pre-8.0.16 Only)

For upgrades to versions before 8.0.16, run `mysql_upgrade` manually:

```bash
sudo mysql_upgrade -u root -p
sudo systemctl restart mysql
```

MySQL 8.0.16+ performs upgrade automatically and `mysql_upgrade` is a no-op.

## Post-Upgrade Verification

```sql
-- Confirm new version
SELECT VERSION();

-- Check all tables
```

```bash
mysqlcheck -u root -p --all-databases --check
```

```sql
-- Review error log summary
SHOW GLOBAL STATUS LIKE 'Uptime';
SHOW GLOBAL STATUS LIKE 'Aborted%';
```

## Rollback Plan

If the upgrade fails, restore from backup:

```bash
# Reinstall old version
sudo apt-get install mysql-server-5.7

# Remove the data directory modified by the newer version
sudo systemctl stop mysql
sudo rm -rf /var/lib/mysql
sudo mysqld --initialize-insecure --user=mysql
sudo systemctl start mysql

# Restore from backup
mysql -u root -p < /backup/pre-upgrade-$(date +%F).sql
```

Note: You cannot downgrade a MySQL data directory that has been opened by a newer version. You must remove the modified data directory, reinitialize it, and then restore from your backup.

## Summary

An in-place MySQL upgrade replaces binaries and lets the server upgrade internal structures on first start. The key steps are: take a full backup, stop the old server, install the new binaries, start, and monitor the error log for upgrade completion messages. Always have a tested restore procedure ready before performing any major version upgrade.
