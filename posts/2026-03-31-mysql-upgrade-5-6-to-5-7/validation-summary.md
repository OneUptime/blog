# Validation Summary: How to Upgrade from MySQL 5.6 to MySQL 5.7

## Status
validated

## Post Type
Tutorial / Step-by-step upgrade guide

## Technologies Covered
- MySQL 5.6 and 5.7
- mysqldump, mysql_upgrade, mysqlcheck CLI tools
- MySQL sql_mode configuration
- MySQL validate_password plugin
- apt-get (Ubuntu) and yum (RHEL/CentOS) package management

## Sources Consulted
- MySQL 5.7 Reference Manual: Upgrading MySQL — https://dev.mysql.com/doc/refman/5.7/en/upgrading.html
- MySQL 5.7 Reference Manual: mysql_upgrade — https://dev.mysql.com/doc/refman/5.7/en/mysql-upgrade.html
- MySQL 5.7 Reference Manual: Server SQL Modes — https://dev.mysql.com/doc/refman/5.7/en/sql-mode.html
- MySQL 5.7 Reference Manual: ANY_VALUE() — https://dev.mysql.com/doc/refman/5.7/en/miscellaneous-functions.html#function_any-value
- MySQL 5.7 Reference Manual: validate_password plugin — https://dev.mysql.com/doc/refman/5.7/en/validate-password.html
- MySQL 5.7 Reference Manual: mysqlcheck — https://dev.mysql.com/doc/refman/5.7/en/mysqlcheck.html

## Issues Found

1. **`mysql_upgrade` described as a pre-upgrade tool (Section: "Run the Pre-Upgrade Check"):** The original text told users to run `mysql_upgrade` "after installing MySQL 5.7 binaries but before starting the new server." This is incorrect — `mysql_upgrade` connects to a running MySQL server and cannot operate on a stopped instance. Replaced with `mysqlcheck --check-upgrade` run against the live 5.6 server, which is the correct pre-upgrade compatibility check.

2. **`TYPE=MyISAM` listed as a 5.6-to-5.7 concern:** The `TYPE` table option was removed in MySQL 5.5. Any functioning MySQL 5.6 database would already use `ENGINE=`, making this a non-issue for a 5.6-to-5.7 upgrade. Replaced with a more relevant concern: old-format temporal columns (`DATETIME`, `TIME`, `TIMESTAMP`) that may need rebuilding.

3. **Duplicate `sql_mode` directive in config snippet:** Two `sql_mode` lines appeared in the same `[mysqld]` section. In MySQL config files, only the last occurrence takes effect, making the first line dead config. Consolidated into a single `sql_mode` line with comments explaining the choices.

4. **GROUP BY fix used `MAX(name)` instead of `ANY_VALUE(name)`:** While `MAX(name)` is syntactically valid, MySQL 5.7 introduced the `ANY_VALUE()` function specifically for migrating queries that select non-aggregated columns not in the GROUP BY clause. Updated to use `ANY_VALUE(name)` as the idiomatic fix.

## Review Notes
- MySQL 5.7 reached end-of-life in October 2023. The post is technically accurate for its stated scope (5.6 to 5.7 upgrade) but readers should be aware that both versions are now EOL and upgrading further to MySQL 8.0+ is strongly recommended.
- The `mysqldump` backup command uses `--single-transaction`, which only provides a consistent snapshot for InnoDB tables. If the database has MyISAM tables, `--lock-all-tables` would be needed for a fully consistent backup. This is acceptable for a general guide but worth noting.
- The Ubuntu install commands assume the MySQL APT repository is already configured. In practice, users may need to add the MySQL APT repository first.
- The RHEL/CentOS command pins a specific version (`5.7.44`). While this was the final 5.7 release, pinning a specific version may cause failures if the exact package is unavailable in the configured repo.
