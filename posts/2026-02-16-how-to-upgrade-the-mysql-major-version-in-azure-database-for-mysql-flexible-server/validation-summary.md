# Validation Summary: How to Upgrade the MySQL Major Version in Azure Database

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Database for MySQL Flexible Server
- Azure CLI
- MySQL 5.7
- MySQL 8.0
- MySQL replication and read replicas
- MySQL SQL compatibility changes

## Sources Consulted
- Microsoft Learn: Major version upgrade in Azure Database for MySQL - https://learn.microsoft.com/en-us/azure/mysql/flexible-server/how-to-upgrade
- Microsoft Learn: Azure CLI `az mysql flexible-server` reference - https://learn.microsoft.com/en-us/cli/azure/mysql/flexible-server
- Microsoft Learn: Azure Database for MySQL version support policy - https://learn.microsoft.com/en-us/azure/mysql/concepts-version-policy
- Microsoft Learn: Major version upgrade FAQ - https://learn.microsoft.com/en-us/azure/mysql/flexible-server/how-to-upgrade-faq
- MySQL 8.0 Reference Manual: Changes in MySQL 8.0 - https://dev.mysql.com/doc/refman/8.0/en/upgrading-from-previous-series.html
- MySQL 8.0 Reference Manual: Keywords and Reserved Words - https://dev.mysql.com/doc/refman/8.0/en/keywords.html
- MySQL 8.0 Reference Manual: JSON Table Functions - https://dev.mysql.com/doc/refman/8.0/en/json-table-functions.html
- MySQL Shell 8.4 Reference Manual: Upgrade Checker Utility - https://dev.mysql.com/doc/mysql-shell/8.4/en/mysql-shell-utilities-upgrade.html

## Issues Found
- The post said MySQL 5.7 was approaching end of life. MySQL 5.7 community support ended on October 31, 2023, and Azure standard support is scheduled to end on July 31, 2026. Updated the wording to reflect the current lifecycle.
- The post said the default collation changed from `utf8mb4_general_ci` to `utf8mb4_0900_ai_ci`. MySQL 8.0 changed the default server collation from `latin1_swedish_ci` to `utf8mb4_0900_ai_ci`. Corrected the source collation.
- The Azure CLI examples used `az mysql flexible-server update --version 8.0.21` for major version upgrades. The official command is `az mysql flexible-server upgrade`, and the CLI accepts a major version such as `8`. Updated the test, production, and replica upgrade commands.
- The read replica section said the primary must be upgraded before replicas. Azure documentation says read replicas with an older MySQL version should be upgraded before the primary server. Corrected the upgrade order and summary text.
- The rollback section listed promotion of an unupgraded read replica as a rollback option. Azure's documented rollback path is restoring backups taken before the major version upgrade to a new server with the previous version. Replaced the replica rollback item with on-demand backup restore.
- The `JSON_TABLE` example used `SELECT JSON_TABLE(...) AS jt`, but MySQL uses `JSON_TABLE()` as a table function in the `FROM` clause. Updated the example to `SELECT * FROM JSON_TABLE(...) AS jt`.
- The post implied `SHOW WARNINGS` checks the MySQL error log. `SHOW WARNINGS` displays session diagnostics for statements, not the server error log. Updated the comment to describe session warning checks.

## Review Notes
The guide is technically sound after correction. Azure's current documentation also recommends using the built-in portal validation and Oracle MySQL Upgrade Checker, checking for obsolete `sql_mode` values, and taking an on-demand backup before production upgrades; those are good future enhancements if the post is expanded.
