# Validation Summary: How to Migrate an On-Premises MySQL Database to Azure Database for MySQL

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Azure Database for MySQL Flexible Server
- Azure Database Migration Service
- MySQL 5.7, 8.0, and 8.4
- mysqldump and mysql command-line client
- mydumper and myloader
- Azure CLI

## Sources Consulted
- Azure Database for MySQL Flexible Server overview: https://learn.microsoft.com/en-us/azure/mysql/flexible-server/overview
- Azure Database for MySQL version support policy: https://learn.microsoft.com/en-us/azure/mysql/concepts-version-policy
- Azure Database for MySQL Flexible Server limitations: https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-limitations
- Azure Database for MySQL Flexible Server server parameters: https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-server-parameters
- Azure CLI `az mysql flexible-server` reference: https://learn.microsoft.com/en-us/cli/azure/mysql/flexible-server
- Azure CLI `az mysql flexible-server parameter` reference: https://learn.microsoft.com/en-us/cli/azure/mysql/flexible-server/parameter
- Azure DMS online MySQL to Azure Database for MySQL Flexible Server tutorial: https://learn.microsoft.com/en-us/azure/dms/tutorial-mysql-azure-external-to-flex-online-portal
- Azure DMS offline MySQL to Azure Database for MySQL tutorial: https://learn.microsoft.com/en-us/azure/dms/tutorial-mysql-azure-mysql-offline-portal
- Azure DMS MySQL schema migration documentation: https://learn.microsoft.com/en-us/azure/dms/concepts-migrate-azure-mysql-schema-migration
- Azure DMS MySQL login migration documentation: https://learn.microsoft.com/en-us/azure/dms/concepts-migrate-azure-mysql-login-migration
- MySQL `mysqldump` reference: https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- MySQL `SET` syntax for variable assignment: https://dev.mysql.com/doc/refman/8.4/en/set-variable.html
- MySQL `INFORMATION_SCHEMA.TABLES` reference: https://dev.mysql.com/doc/refman/8.4/en/information-schema-tables-table.html
- mydumper and myloader documentation: https://mydumper.github.io/mydumper/docs/html/

## Issues Found
- Azure Database for MySQL Flexible Server version support was outdated. Updated the compatibility note to include MySQL 8.4 as a generally available version.
- The Azure CLI create example used `--version 8.0.21`, but the CLI example pattern uses major versions such as `5.7` and `8.0`. Changed the example to `--version 8.0`.
- The import tuning section attempted to set `foreign_key_checks` as an Azure server parameter. Reworked this to set `foreign_key_checks` and `unique_checks` only for the mysql import session with `--init-command`.
- The DMS setup section said Standard tier was for offline migrations. Current Microsoft documentation for MySQL DMS migration uses the Premium tier, so the tier guidance was corrected.
- The DMS binlog retention snippet used only `expire_logs_days`, which applies to MySQL 5.7. Added the MySQL 8.0+ equivalent `binlog_expire_logs_seconds`.
- The DMS section did not call out target-version limits. Added a note that current online migration documentation lists MySQL 5.7 and 8.0 targets.
- The post-migration row-count query implied exact counts from `INFORMATION_SCHEMA.TABLES.TABLE_ROWS`. Updated the comment to say approximate counts and added guidance to use `COUNT(*)` for exact validation.
- The cutover checklist mentioned a final incremental sync for dump/restore without defining a supported mechanism. Changed it to repeat the dump and restore after writes are stopped.
- The missing-users note implied users are never migrated automatically. Updated it to mention DMS login migration as an explicit option.

## Review Notes
The post is technically relevant and broadly accurate after the fixes. The mydumper/myloader example is plausible, but exact package availability and supported options can vary by distribution and mydumper version. For production migrations, readers should verify Azure region/SKU availability with `az mysql flexible-server list-skus` and test DMS target-version support in their subscription before scheduling cutover.
