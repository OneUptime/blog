# How to Upgrade from MySQL 8.0 to MySQL 8.4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Upgrade, Database Administration, Migration, Version

Description: Upgrade MySQL from 8.0 to 8.4 LTS safely by running pre-upgrade checks, updating packages, and validating schema compatibility with the new version.

---

## About MySQL 8.4

MySQL 8.4 is the first long-term support (LTS) release in the new MySQL Innovation release model. It introduces changes around the `mysql_native_password` plugin (now disabled by default), improved EXPLAIN output, and refinements to replication and InnoDB. If your application relies on `mysql_native_password`, you must plan for that migration.

## Pre-Upgrade Backup

```bash
mysqldump -u root -p --all-databases --single-transaction \
  --routines --triggers --events > /backup/mysql80-pre-upgrade-$(date +%F).sql

# Also export a variable snapshot for comparison
mysql -u root -p -e "SHOW VARIABLES\G" > /backup/mysql80-variables.txt
```

## Running the Pre-Upgrade Utility

MySQL 8.0.16+ ships with `mysqlcheck` and the `util.checkForServerUpgrade()` function in MySQL Shell:

```bash
mysqlsh root@localhost -- util checkForServerUpgrade \
  --outputFormat=TEXT \
  --target-version=8.4.0 2>&1 | tee /tmp/upgrade-check.txt
```

Review the output for:
- Usage of `mysql_native_password` accounts
- Removed or changed system variables
- Incompatible SQL modes or character sets

## Identifying native_password Users

```sql
SELECT User, Host, plugin
FROM mysql.user
WHERE plugin = 'mysql_native_password';
```

Migrate them before upgrading:

```sql
ALTER USER 'appuser'@'%' IDENTIFIED WITH caching_sha2_password BY 'NewStrongPass!';
```

If you cannot migrate all users before the upgrade, temporarily re-enable the plugin in `mysqld.cnf`:

```ini
[mysqld]
mysql_native_password = ON
```

## Performing the Upgrade on Ubuntu

```bash
sudo apt-get update
sudo apt-get install mysql-server-8.4

# Verify the version
mysql -u root -p -e "SELECT VERSION();"
```

MySQL 8.4 runs in-place upgrade automatically and performs dictionary schema upgrades on first start.

## Performing the Upgrade on RHEL

```bash
sudo yum install mysql-community-server-8.4
sudo systemctl start mysqld
```

## Post-Upgrade Validation

Check for errors in the error log:

```bash
sudo tail -200 /var/log/mysql/error.log | grep -iE "error|warning|deprecated"
```

Verify table status:

```bash
mysqlcheck -u root -p --all-databases --check --auto-repair
```

Note: `mysql_upgrade` was removed in MySQL 8.4. The server now performs all upgrade tasks automatically on first startup, so no manual upgrade step is needed.

## Checking Removed Variables

Some 8.0 variables were removed in 8.4. Query for any references in your config:

```sql
SHOW VARIABLES LIKE 'query_cache%';
-- query_cache was fully removed in 8.0, should return empty
```

Check the 8.4 release notes for the full list of removed variables:

```bash
mysql -u root -p -e "SELECT VARIABLE_NAME FROM performance_schema.global_variables WHERE VARIABLE_NAME LIKE 'expire_logs_days';"
-- Replaced by binlog_expire_logs_seconds in 8.0+
```

## Summary

Upgrading from MySQL 8.0 to 8.4 LTS is straightforward but requires addressing `mysql_native_password` usage before the upgrade, running `mysqlcheck` pre and post, and reviewing the error log for deprecation warnings. MySQL 8.4 brings long-term stability commitments, making it the recommended target for production workloads moving off 8.0.
