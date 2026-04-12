# How to Check MySQL Upgrade Compatibility

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Upgrade, Compatibility, MySQL Shell, Pre-Upgrade Check

Description: Use MySQL Shell's upgrade checker and manual queries to identify compatibility issues before upgrading MySQL to a new major version.

---

## Why Pre-Upgrade Checking Matters

Upgrading MySQL without checking compatibility can break applications due to removed functions, changed defaults, reserved word conflicts, or schema issues. MySQL Shell and `mysqlcheck` provide tools to surface these problems before any change to production.

## Using MySQL Shell checkForServerUpgrade

MySQL Shell's `util.checkForServerUpgrade()` is the primary tool for pre-upgrade assessment. It runs dozens of checks against the running server.

Install MySQL Shell:

```bash
sudo apt-get install mysql-shell
```

Run the upgrade check targeting MySQL 8.0:

```bash
mysqlsh root@localhost -- util checkForServerUpgrade \
  --target-version=8.0.0 \
  --outputFormat=TEXT 2>&1 | tee /tmp/upgrade-check-80.txt
```

For upgrading to MySQL 8.4:

```bash
mysqlsh root@localhost -- util checkForServerUpgrade \
  --target-version=8.4.0 \
  --outputFormat=TEXT 2>&1 | tee /tmp/upgrade-check-84.txt
```

## Understanding the Output

The checker reports issues in three severity categories:

```text
1) Usage of old temporal type
  No issues found

2) Usage of db objects with names conflicting with new reserved keywords
  myapp.rank_data - Table name conflicts with new reserved word RANK
  myapp.groups - Table name conflicts with new reserved word GROUPS
  Errors: 2

3) MySQL 8.0 syntax check for routine-like objects
  Errors: 0
```

Items marked as **Errors** will break the upgrade or cause failures. **Warnings** should be reviewed but will not block the upgrade. **Notices** are informational items about manual checks that may be needed.

## Fixing Reserved Word Conflicts

If a table or column name conflicts with a new reserved word, quote it with backticks in your application SQL or rename it:

```sql
-- Rename conflicting table
RENAME TABLE `rank_data` TO `ranking_data`;

-- Or use backticks consistently in queries
SELECT `rank`, score FROM `ranking_data`;
```

## Manual Compatibility Checks

Check for zero dates that strict mode rejects:

```sql
SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME
FROM information_schema.COLUMNS
WHERE DATA_TYPE IN ('datetime', 'date', 'timestamp')
  AND TABLE_SCHEMA NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys');
```

Then check for actual zero values:

```sql
SELECT COUNT(*) FROM myapp.orders WHERE created_at = '0000-00-00 00:00:00';
```

Check for `mysql_native_password` users (disabled by default in 8.4):

```sql
SELECT User, Host, plugin FROM mysql.user WHERE plugin = 'mysql_native_password';
```

Check for non-default character sets that 8.0+ may handle differently:

```sql
SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_COLLATION
FROM information_schema.TABLES
WHERE TABLE_COLLATION LIKE 'latin1%'
  AND TABLE_SCHEMA NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys');
```

## Checking Configuration Variables

Some variables were removed or renamed between versions. Check your `mysqld.cnf`:

```bash
# Variables removed or deprecated in 8.0
grep -E "query_cache|expire_logs_days|innodb_file_format|innodb_large_prefix" \
  /etc/mysql/mysql.conf.d/mysqld.cnf
```

Test if the config will load with the new binary before upgrading:

```bash
mysqld-new --validate-config --defaults-file=/etc/mysql/mysql.conf.d/mysqld.cnf
```

## Running mysqlcheck

```bash
mysqlcheck -u root -p --all-databases --check --auto-repair
```

This verifies InnoDB table integrity and reports any tables that need repair before the upgrade.

## Summary

Thorough pre-upgrade compatibility checking prevents surprises during MySQL major version upgrades. Use MySQL Shell's `checkForServerUpgrade` as the primary tool, supplement with manual queries for zero dates, reserved word conflicts, and deprecated authentication plugins, and validate your configuration file against the new binary before making any changes to production.
