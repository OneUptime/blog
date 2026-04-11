# Validation Summary: How to Use mysql_upgrade After a MySQL Version Upgrade

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (5.7, 8.0, 8.4)
- mysql_upgrade CLI tool
- mysqldump
- systemctl (Linux service management)

## Sources Consulted
- MySQL 5.7 Reference Manual: mysql_upgrade — https://dev.mysql.com/doc/refman/5.7/en/mysql-upgrade.html
- MySQL 8.0 Reference Manual: mysql_upgrade — https://dev.mysql.com/doc/refman/8.0/en/mysql-upgrade.html
- MySQL 8.0 Reference Manual: CHECK TABLE — https://dev.mysql.com/doc/refman/8.0/en/check-table.html
- MySQL 8.0 Reference Manual: REPAIR TABLE — https://dev.mysql.com/doc/refman/8.0/en/repair-table.html
- MySQL 8.0.16 Release Notes (deprecation of mysql_upgrade) — https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-16.html
- MySQL 8.4 Reference Manual (removal of mysql_upgrade) — https://dev.mysql.com/doc/refman/8.4/en/upgrading.html

## Issues Found

1. **Incorrect sample output — "Restarting the server, please wait..."**: The `mysql_upgrade` tool does not restart the MySQL server. The sample output included a misleading line suggesting it does. Removed that line and added an explicit instruction to restart the server manually after the tool completes.

2. **REPAIR TABLE incorrectly presented as a general fix**: The post showed `REPAIR TABLE` as a fix for any table that fails during upgrade, but `REPAIR TABLE` only works with MyISAM, ARCHIVE, and CSV storage engines — not InnoDB (the default). Added a clarifying note and adjusted the SQL comments to make this limitation clear.

3. **MySQL 8.0 no-op claim too broad**: The post stated `mysql_upgrade` is "effectively a no-op" in MySQL 8.0 without specifying this only applies from 8.0.16 onward. In 8.0.0 through 8.0.15, the tool still needed to be run manually. Also noted that `mysql_upgrade` was removed entirely in MySQL 8.4. Updated both the section body and the summary to be version-specific.

## Review Notes
- The `FLUSH PRIVILEGES` section after upgrade is technically redundant because `mysql_upgrade` itself runs `FLUSH PRIVILEGES` upon completion. However, it's not harmful and serves as a safety step, so it was left as-is.
- The `mysql_upgrade_info` file was removed as a mechanism in MySQL 8.0.16+ (replaced by the data dictionary). The post could mention this in the future but it's not incorrect for the 5.7 context where it's presented.
