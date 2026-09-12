# Validation Summary: Query Across Azure SQL Databases with External Tables

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure SQL Database
- Azure SQL elastic query
- Azure SQL elastic pools
- Transact-SQL external tables and external data sources
- Database-scoped credentials and contained SQL users
- Azure SQL firewall, outbound networking, and Private Link constraints

## Sources Consulted
- [Azure SQL Database elastic query overview (preview)](https://learn.microsoft.com/en-us/azure/azure-sql/database/elastic-query-overview?view=azuresql)
- [Get started with cross-database queries (vertical partitioning)](https://learn.microsoft.com/en-us/azure/azure-sql/database/elastic-query-getting-started-vertical?view=azuresql)
- [Query across cloud databases with different schemas](https://learn.microsoft.com/en-us/azure/azure-sql/database/elastic-query-vertical-partitioning?view=azuresql)
- [T-SQL differences between SQL Server and Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/transact-sql-tsql-differences-sql-server?view=azuresql)
- [CREATE EXTERNAL TABLE (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-external-table-transact-sql)
- [CREATE DATABASE SCOPED CREDENTIAL (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-database-scoped-credential-transact-sql)
- [IP firewall rules for Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/firewall-configure?view=azuresql)
- [Outbound firewall rules for Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/outbound-firewall-rule-overview?view=azuresql)
- [Azure SQL Database elastic pool overview](https://learn.microsoft.com/en-us/azure/azure-sql/database/elastic-pool-overview?view=azuresql)

## Issues Found
- The authentication discussion did not make clear that elastic query also requires the application to connect to the query database with SQL Server authentication. The text now states that scope explicitly because Microsoft Entra authentication is not currently supported for elastic-query connections.
- The setup omitted the required inbound firewall configuration on the remote logical server. Added the requirement to enable **Allow Azure services and resources to access this server**, together with the warning that this permits connection attempts from Azure resources outside the subscription and therefore must be paired with least-privilege SQL credentials.

## Review Notes
Elastic query remains a preview feature. The post correctly describes unsupported three-part cross-database names, read-only external tables, the `nvarchar(max)` batching caveat, first-query startup latency, Private Link limitations for target databases, outbound destination controls, and the absence of a separate elastic-query feature charge. The examples use valid current T-SQL syntax and placeholders appropriately.
