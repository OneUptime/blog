# How to Use mysql_upgrade After an Upgrade

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Upgrade, Mysql Upgrade, Database Migration, Maintenance

Description: Learn how to use mysql_upgrade to update system tables and check all user tables for compatibility after upgrading MySQL to a newer version.

---

## What Is mysql_upgrade

`mysql_upgrade` is a command-line utility that prepares MySQL databases after a version upgrade. It performs two main tasks: it upgrades the system tables in the `mysql` schema to match the new server version, and it checks all user tables for any incompatibilities introduced by the new version.

Starting with MySQL 8.0.16, the server performs upgrade tasks automatically on startup, making `mysql_upgrade` largely unnecessary for 8.0.16 and later. For earlier versions or MySQL 5.7, running `mysql_upgrade` is a required post-upgrade step.

## When to Run mysql_upgrade

Run `mysql_upgrade` after:

- Upgrading from MySQL 5.6 to 5.7
- Upgrading from MySQL 5.7 to 8.0 (versions before 8.0.16)
- Restoring a dump from an older MySQL version
- Any in-place binary upgrade on Linux

For MySQL 8.0.16 and later, skip this step - the server handles it automatically.

## Basic Usage

After installing the new MySQL version and starting the server, run:

```bash
mysql_upgrade -u root -p
```

This connects to the running MySQL server and performs the upgrade.

## What mysql_upgrade Does

1. Runs `mysqlcheck --all-databases --check-upgrade --auto-repair` to verify and fix any tables that need upgrades
2. Updates system tables in the `mysql` schema to the new format
3. Updates the contents of the `sys` schema if present
4. Creates any new privilege tables introduced in the new version
5. Marks the data directory with the new version number

## Sample Output

```text
Checking if update is needed.
Checking server version.
Running queries to upgrade MySQL server.
Upgrading the sys schema.
Checking databases.
sys
mysql
mtr
myapp
Upgrade process completed successfully.
Checking if update is needed.
```

## Check If Upgrade Is Needed

Simply run `mysql_upgrade` normally. If the data directory already matches the server version, it exits without making changes and outputs:

```text
This installation of MySQL is already upgraded to 5.7.XX, use --force if you still need to run mysql_upgrade
```

## Force a Re-run

Use `--force` to re-run the upgrade even if the version check indicates it is not needed:

```bash
mysql_upgrade -u root -p --force
```

This is useful after a failed upgrade attempt or when troubleshooting.

## Skip User Table Checks

If you only want to upgrade system tables without checking all user tables (faster for large installations), use:

```bash
mysql_upgrade -u root -p --upgrade-system-tables
```

This skips the `mysqlcheck` step.

## Connecting to a Non-Default Port or Host

```bash
mysql_upgrade -u root -p -h 127.0.0.1 -P 3307
```

## Using a Defaults File

Store credentials in a protected file to avoid entering them on the command line:

```bash
# /root/.my.cnf
[client]
user=root
password=your_password
```

Then run:

```bash
mysql_upgrade
```

## Running mysql_upgrade in Docker

If running MySQL in Docker after an upgrade:

```bash
docker exec -it mysql_container mysql_upgrade -u root -p
```

For MySQL 8.0.16 and later, the server handles upgrades automatically. You can force a re-upgrade using the `--upgrade` server option:

```bash
docker run -e MYSQL_ROOT_PASSWORD=secret mysql:8.0 mysqld --upgrade=FORCE
```

## Post-Upgrade Verification

After running `mysql_upgrade`, verify the server version and check for errors:

```sql
SELECT VERSION();

-- Check for any tables that could not be upgraded
SELECT TABLE_SCHEMA, TABLE_NAME, ENGINE
FROM information_schema.TABLES
WHERE TABLE_COMMENT LIKE '%needs%'
   OR TABLE_COMMENT LIKE '%check%';
```

Also review the MySQL error log for any warnings generated during the upgrade.

## MySQL 8.0.16+ Automatic Upgrade

For MySQL 8.0.16 and later, the server performs data dictionary and system table upgrades automatically when started after a version change. Verify automatic upgrade status:

```sql
SHOW VARIABLES LIKE 'upgrade';
```

The `upgrade` system variable controls behavior: `AUTO` (default), `MINIMAL`, `NONE`, or `FORCE`.

## Summary

`mysql_upgrade` is a critical post-upgrade step for MySQL versions before 8.0.16. It ensures system tables match the new server schema and verifies that all user tables are compatible with the upgraded version. Always run it immediately after starting the upgraded server, and review the output and error logs to confirm the upgrade completed without issues.
