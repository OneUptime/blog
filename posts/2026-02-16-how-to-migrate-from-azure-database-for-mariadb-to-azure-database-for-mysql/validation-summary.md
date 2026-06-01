# Validation Summary: How to Migrate from Azure Database for MariaDB to Azure Database for MySQL

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Azure Database for MariaDB
- Azure Database for MySQL Flexible Server
- Azure CLI
- Azure Database Migration Service
- MariaDB
- MySQL
- mysqldump
- SQL

## Sources Consulted
- Microsoft Learn: Azure Database for MySQL documentation - https://learn.microsoft.com/en-us/azure/mysql/
- Microsoft Learn: Migrate using dump and restore for Azure Database for MySQL Flexible Server - https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-migrate-dump-restore
- Microsoft Learn: Azure CLI `az mysql flexible-server create` reference - https://learn.microsoft.com/en-us/cli/azure/mysql/flexible-server
- Microsoft Learn: Azure CLI `az mysql flexible-server parameter set` reference - https://learn.microsoft.com/en-us/cli/azure/mysql/flexible-server/parameter
- Microsoft Learn: Azure Database Migration Service supported migration scenarios - https://learn.microsoft.com/azure/dms/resource-scenario-status
- Microsoft Learn: Migrate MySQL to Azure Database for MySQL using DMS - https://learn.microsoft.com/en-us/azure/dms/tutorial-mysql-azure-mysql-offline-portal
- Microsoft Tech Community: Azure Database for MariaDB retirement announcement - https://techcommunity.microsoft.com/t5/azure-database-for-mysql-blog/azure-database-for-mariadb-is-being-retired-on-19-september-2025/ba-p/3935681
- MariaDB Documentation: Information Schema TABLES table - https://mariadb.com/docs/server/reference/system-tables/information-schema/information-schema-tables/information-schema-tables-table
- MariaDB Documentation: Information Schema SEQUENCES table - https://mariadb.com/docs/server/reference/system-tables/information-schema/information-schema-tables/information-schema-sequences-table
- MariaDB Documentation: System-versioned tables - https://mariadb.com/docs/server/reference/sql-structure/temporal-tables/system-versioned-tables
- MySQL 8.0 Reference Manual: Caching SHA-2 pluggable authentication - https://dev.mysql.com/doc/mysql/8.0/en/caching-sha2-pluggable-authentication.html

## Issues Found
- The post described Azure Database for MariaDB as still being on the retirement path. Microsoft announced retirement for September 19, 2025, which is now in the past, so the wording was updated to past tense and to note that migration applies when a running instance, dump, or backup is still available.
- The Azure CLI example used `--version 8.0.21`. Current Azure CLI documentation for MySQL Flexible Server creation accepts major version values such as `8` and `8.4`, so the command was changed to `--version 8`.
- The sequence audit query used `information_schema.sequences`. MariaDB documentation says that table is available starting with MariaDB 11.5, while Azure Database for MariaDB used MariaDB 10.2 or 10.3. The query was changed to inspect `information_schema.tables` where `table_type = 'SEQUENCE'`.
- The summary warned readers not to wait until the last minute. Since the Azure Database for MariaDB retirement date has already passed, this was updated to avoid implying a future retirement deadline.

## Review Notes
- The guide remains technically relevant as a migration pattern for remaining accessible Azure Database for MariaDB instances, exported dumps, restored backups, or similar MariaDB 10.2/10.3 sources.
- The post's advice to test SQL modes, collations, authentication plugins, storage engines, routines, views, and application drivers is consistent with the documented compatibility risks between MariaDB and MySQL 8.0.
- The local workspace does not have Azure CLI installed, so Azure CLI commands were validated against Microsoft Learn rather than local `az --help` output.
