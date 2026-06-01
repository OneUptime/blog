# Validation Summary: How to Migrate from Azure SQL Database to Azure SQL Managed Instance

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Azure SQL Database
- Azure SQL Managed Instance
- SqlPackage
- Azure Database Migration Service
- Azure Data Factory
- BCP
- Transactional replication
- T-SQL dynamic management views and catalog views

## Sources Consulted
- Microsoft Learn: Azure Database Migration Service supported scenarios - https://learn.microsoft.com/en-us/azure/dms/resource-scenario-status
- Microsoft Learn: SqlPackage Export parameters and properties - https://learn.microsoft.com/en-us/sql/tools/sqlpackage/sqlpackage-export
- Microsoft Learn: SqlPackage Import parameters and properties - https://learn.microsoft.com/en-us/sql/tools/sqlpackage/sqlpackage-import
- Microsoft Learn: Export to a BACPAC file - Azure SQL Database and Azure SQL Managed Instance - https://learn.microsoft.com/en-us/azure/azure-sql/database/database-export
- Microsoft Learn: Transactional replication with Azure SQL Managed Instance - https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/replication-transactional-overview
- Microsoft Learn: Configure public endpoint in Azure SQL Managed Instance - https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/public-endpoint-configure
- Microsoft Learn: Connectivity architecture for Azure SQL Managed Instance - https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/connectivity-architecture-overview
- Microsoft Learn: sys.server_resource_stats for Azure SQL Managed Instance - https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-server-resource-stats-azure-sql-database
- Microsoft Learn: T-SQL differences between SQL Server and Azure SQL Managed Instance - https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/transact-sql-tsql-differences-sql-server
- Microsoft Learn: Time zones in Azure SQL Managed Instance - https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/timezones-overview

## Issues Found
- The assessment section recommended Azure Database Migration Service or a DMA command for Azure SQL Database to SQL Managed Instance assessment. DMS online migration support to SQL Managed Instance is documented for SQL Server and Amazon RDS SQL Server sources, not Azure SQL Database sources, and the DMA command used an unsupported `SqlOnAzure` source platform. Replaced it with a source-database inventory query and clarified the DMS limitation.
- The SqlPackage examples used Azure Blob Storage URLs as `/TargetFile` and `/SourceFile` with a `/StorageKey` argument. SqlPackage BACPAC export/import actions require filesystem paths for `TargetFile` and `SourceFile`; `StorageKey` is not an import/export parameter. Updated the examples to local filesystem paths and added a note to stage BACPAC files in storage separately if needed.
- The BACPAC setup comment said SqlPackage creates the BACPAC in Azure Blob Storage. Clarified that portal export can write to Blob Storage, while SqlPackage writes to a filesystem path.
- The online DMS migration option described continuous sync from Azure SQL Database to SQL Managed Instance. This source-target pair is not listed as supported for DMS online migration. Replaced the section with Azure Data Factory or BCP-based data copy guidance for larger migrations.
- The transactional replication section said Azure SQL Database could be the publisher and SQL Managed Instance the subscriber. Microsoft documents Azure SQL Database as a push subscriber only, while SQL Managed Instance can act as publisher, distributor, or subscriber. Corrected the claim.
- The broken dependency query called `sys.dm_sql_referencing_entities('dbo', 'OBJECT')`, which is not a valid way to check database-wide broken dependencies. Replaced it with a `sys.sql_expression_dependencies` query that identifies unresolved referenced entities.
- The validation section said a query verified that stored procedures compiled successfully, but the query only listed routines. Updated the wording to accurately describe it as a review/refresh inventory.
- The public endpoint connection string omitted the `.public.` host name label required for SQL Managed Instance public endpoints. Updated the example to `myinstance.public.abc123.database.windows.net,3342`.
- The connection string note referred to private endpoint connections on port 1433. Clarified that port 1433 applies to the VNet-local endpoint for private connectivity through the VNet.

## Review Notes
The guide is now technically accurate as a high-level migration guide, but true near-zero-downtime migration from Azure SQL Database to SQL Managed Instance generally requires an application-specific replication or data-copy design because the native online migration tooling is focused on SQL Server sources.
