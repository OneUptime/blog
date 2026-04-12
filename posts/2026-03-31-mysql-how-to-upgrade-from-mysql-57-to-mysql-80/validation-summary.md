# Validation Summary: How to Upgrade from MySQL 5.7 to MySQL 8.0

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- MySQL 5.7
- MySQL 8.0
- MySQL Shell (mysqlsh)
- mysqlcheck
- mysqldump
- mysql_upgrade

## Sources Consulted
- MySQL 8.0 Reference Manual — Keywords and Reserved Words: https://dev.mysql.com/doc/refman/8.0/en/keywords.html
- MySQL 5.7 Reference Manual — Keywords and Reserved Words: https://dev.mysql.com/doc/refman/5.7/en/keywords.html
- MySQL 8.0 Reference Manual — mysqlcheck: https://dev.mysql.com/doc/refman/8.0/en/mysqlcheck.html
- MySQL 8.0 Reference Manual — Upgrade Checker Utility: https://dev.mysql.com/doc/mysql-shell/8.0/en/mysql-shell-utilities-upgrade.html
- MySQL 8.0 Reference Manual — mysqldump options (--master-data / --source-data): https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- MySQL 8.0 Reference Manual — default_authentication_plugin: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_default_authentication_plugin
- MySQL 8.0 Reference Manual — Numeric Type Attributes (ZEROFILL deprecation): https://dev.mysql.com/doc/refman/8.0/en/numeric-type-attributes.html

## Issues Found

1. **`mysqlcheck` incorrectly described as "deprecated"**: The post called `mysqlcheck --check-upgrade` the "deprecated `mysqlcheck` approach." `mysqlcheck` is not deprecated in any MySQL version — it is still a supported utility. Changed to "the older `mysqlcheck` approach (less comprehensive)" to accurately convey that MySQL Shell's upgrade checker is preferred without incorrectly labeling the tool as deprecated.

2. **Incorrect command for finding reserved word conflicts**: The post used `mysqlcheck -u root -p --all-databases --check-upgrade 2>&1 | grep "keyword"` to find reserved word conflicts. This is incorrect — `mysqlcheck --check-upgrade` runs `CHECK TABLE ... FOR UPGRADE`, which only detects data type, index, and character set incompatibilities. It does **not** detect reserved word conflicts in column or table names. Replaced with a proper SQL query against `information_schema.columns` that checks for all MySQL 8.0 reserved words that were not reserved in 5.7 (RANK, GROUPS, SYSTEM, CUME_DIST, DENSE_RANK, EMPTY, FIRST_VALUE, GROUPING, JSON_TABLE, LAG, LAST_VALUE, LATERAL, LEAD, NTH_VALUE, NTILE, OF, OVER, PERCENT_RANK, RECURSIVE, ROW_NUMBER, ROWS, WINDOW).

## Review Notes
- The `--master-data=2` flag in the mysqldump command (Step 3) is deprecated as of MySQL 8.0.26, replaced by `--source-data=2`. However, since the backup is taken on a MySQL 5.7 server before the upgrade, `--master-data=2` is the correct flag to use in this context.
- The `default_authentication_plugin` system variable mentioned in Step 6 is deprecated as of MySQL 8.0.27, replaced by `authentication_policy`. The advice is still functional across all 8.0 versions but may need updating when MySQL 8.0 reaches end of life and users target newer versions.
- The specific package versions referenced (e.g., `mysql-apt-config_0.8.28-1_all.deb`, `mysql80-community-release-el7-9.noarch.rpm`) will become outdated as newer packages are released. Users should check the MySQL downloads page for the latest versions.
- The RHEL/CentOS section uses `yum`, which is appropriate for CentOS 7/RHEL 7 (matching the el7 RPM). For RHEL 8+ or CentOS Stream 8+, `dnf` would be the package manager.
