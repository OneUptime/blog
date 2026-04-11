# How to Upgrade from MySQL 5.6 to MySQL 5.7

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Upgrade, Migration, Database Administration, Version

Description: Step-by-step guide to safely upgrading a MySQL 5.6 server to MySQL 5.7, covering pre-upgrade checks, the upgrade process, and post-upgrade validation.

---

## Before You Upgrade

MySQL 5.7 introduced significant changes: strict SQL mode is enabled by default, the password validation plugin is installed, and the `sql_mode` default changed. These can break applications that worked fine on 5.6.

Always back up before upgrading:

```bash
mysqldump -u root -p --all-databases --single-transaction \
  --routines --triggers --events > /backup/full-backup-$(date +%F).sql
```

Also record your current configuration and schema:

```bash
mysql -u root -p -e "SHOW VARIABLES;" > /backup/mysql56-variables.txt
mysql -u root -p -e "SHOW GLOBAL STATUS;" > /backup/mysql56-status.txt
```

## Run Pre-Upgrade Checks

Before upgrading, run compatibility checks on your 5.6 server:

```bash
# Check all databases for upgrade compatibility issues
mysqlcheck -u root -p --all-databases --check-upgrade
```

Check the output carefully for errors. Common 5.6 to 5.7 issues:

- Triggers or views with undefined or missing DEFINER
- Views that use reserved words added in 5.7
- Old temporal columns (`DATETIME`, `TIME`, `TIMESTAMP`) stored in pre-5.6 format that need rebuilding

## Installing MySQL 5.7

On Ubuntu:

```bash
sudo apt-get remove mysql-server mysql-client mysql-common
sudo apt-get install mysql-server-5.7
```

On RHEL/CentOS:

```bash
sudo yum remove mysql-server
sudo yum install mysql-community-server-5.7.44
```

## Key Configuration Changes

Update `/etc/mysql/mysql.conf.d/mysqld.cnf` before starting:

```ini
[mysqld]
# Relax strict mode for 5.6 compatibility
# Add ONLY_FULL_GROUP_BY exclusion if your queries rely on loose GROUP BY behavior
sql_mode = NO_ENGINE_SUBSTITUTION,NO_AUTO_CREATE_USER

# Disable password validation if it breaks existing passwords
validate_password = OFF
```

## Starting and Validating

```bash
sudo systemctl start mysql
sudo mysql_upgrade -u root -p
sudo systemctl restart mysql
```

Check the version:

```sql
SELECT VERSION();
-- Should return: 5.7.x
```

## Testing Application Compatibility

The most common 5.6 to 5.7 breakage is GROUP BY strictness. Queries like:

```sql
-- Worked in 5.6 (non-strict)
SELECT user_id, name, MAX(created_at) FROM orders GROUP BY user_id;
```

In 5.7 with `ONLY_FULL_GROUP_BY` mode, `name` must be in the GROUP BY or wrapped in an aggregate function. The idiomatic fix is to use `ANY_VALUE()`, which was introduced in MySQL 5.7 for this purpose:

```sql
SELECT user_id, ANY_VALUE(name), MAX(created_at) FROM orders GROUP BY user_id;
```

Check for date zero values that 5.7 rejects in strict mode:

```sql
SELECT * FROM orders WHERE order_date = '0000-00-00';
UPDATE orders SET order_date = NULL WHERE order_date = '0000-00-00';
```

## Post-Upgrade Checklist

```bash
# Verify all tables are OK
mysqlcheck -u root -p --all-databases --check

# Check error log for warnings
sudo tail -100 /var/log/mysql/error.log
```

## Summary

Upgrading from MySQL 5.6 to 5.7 requires careful attention to SQL mode changes, strict mode enforcement, and the new password validation plugin. Back up fully, run `mysql_upgrade` after installation, and test your application queries against the stricter GROUP BY and date handling before cutting over in production.
