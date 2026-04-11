# Validation Summary: How to Perform an In-Place MySQL Upgrade

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.6, 5.7, 8.0, 8.4)
- MySQL Shell (`mysqlsh`)
- mysqldump, mysqlcheck, mysql_upgrade CLI tools
- systemd service management
- APT and YUM package managers

## Sources Consulted
- MySQL 8.0 Reference Manual: Upgrading MySQL — https://dev.mysql.com/doc/refman/8.0/en/upgrading.html
- MySQL 8.0 Reference Manual: What the MySQL Upgrade Process Upgrades — https://dev.mysql.com/doc/refman/8.0/en/upgrading-what-is-upgraded.html
- MySQL 8.0 Reference Manual: mysql_upgrade — https://dev.mysql.com/doc/refman/8.0/en/mysql-upgrade.html
- MySQL Shell Upgrade Checker Utility — https://dev.mysql.com/doc/mysql-shell/8.0/en/mysql-shell-utilities-upgrade.html
- MySQL 8.0 Reference Manual: mysqldump — https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- MySQL 8.0 Reference Manual: Downgrading MySQL — https://dev.mysql.com/doc/refman/8.0/en/downgrading.html

## Issues Found

### 1. Incorrect section title for mysql_upgrade
- **What was wrong:** The section title read "Running mysql_upgrade (Pre-8.0 Only)" but the body correctly explained that `mysql_upgrade` is needed for target versions before 8.0.16. The title was misleading because `mysql_upgrade` is still required when upgrading to MySQL 8.0.0 through 8.0.15.
- **What was changed:** Updated the section title to "Running mysql_upgrade (Pre-8.0.16 Only)".
- **Why:** The automatic server upgrade was introduced in MySQL 8.0.16. For any target version before 8.0.16 (including early 8.0.x releases), `mysql_upgrade` must be run manually.

### 2. Incomplete rollback procedure
- **What was wrong:** The rollback plan showed installing the old MySQL version and restoring from a SQL dump, but omitted the critical step of removing and reinitializing the data directory. Once a newer MySQL version opens the data directory, it cannot be used by an older version.
- **What was changed:** Added commands to stop MySQL, remove the modified data directory (`/var/lib/mysql`), reinitialize it with `mysqld --initialize-insecure`, and start MySQL before restoring from backup. Updated the explanatory note accordingly.
- **Why:** Without removing the data directory modified by the newer version, the older MySQL server would fail to start. The post's own note mentioned this constraint, but the commands did not reflect it.

## Review Notes
- The `mysqld --initialize-insecure` flag in the rollback section creates a root account with no password, which is appropriate for the immediate restore step but users should be aware of this. The `--initialize` flag (with a random password) is the secure alternative but adds friction during the restore.
- The supported upgrade path list is correct and includes the MySQL 8.0 to 8.4 path (Innovation/LTS track), which is a relatively recent addition.
- The MySQL Shell `checkForServerUpgrade` utility syntax is correct for command-line invocation using the `--` API call syntax.
- The error log message format shown (`[System] [MY-XXXXXX] [Server]`) matches the MySQL 8.0 structured error log format.
