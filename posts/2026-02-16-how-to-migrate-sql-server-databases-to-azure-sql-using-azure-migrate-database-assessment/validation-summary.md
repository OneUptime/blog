# Validation Summary: How to Migrate SQL Server Databases to Azure SQL

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Azure Migrate
- SQL Server
- Azure SQL Database
- Azure SQL Managed Instance
- SQL Server on Azure VMs
- SQL Server Management Studio migration component
- Azure Database Migration Service
- Azure SQL elastic query
- Azure Elastic Jobs
- SQL Server transactional replication

## Sources Consulted
- Microsoft Download Center: Microsoft Data Migration Assistant v5.8 retirement notice: https://www.microsoft.com/en-us/download/details.aspx?id=53595
- Microsoft Learn: Migrate SQL Server to Azure SQL using the migration component in SSMS: https://learn.microsoft.com/en-us/ssms/migrate/migrate-sql-server-azure-sql
- Microsoft Learn: Azure SQL assessments in Azure Migrate Discovery and assessment tool: https://learn.microsoft.com/en-us/azure/migrate/concepts-azure-sql-assessment-calculation
- Microsoft Learn: Create an Azure SQL assessment: https://learn.microsoft.com/en-us/azure/migrate/how-to-create-azure-sql-assessment
- Microsoft Learn: Assessment rules for SQL Server to Azure SQL Database migration: https://learn.microsoft.com/en-us/data-migration/sql-server/database/assessment-rules
- Microsoft Learn: Assessment rules for SQL Server to Azure SQL Managed Instance migration: https://learn.microsoft.com/en-us/data-migration/sql-server/managed-instance/assessment-rules
- Microsoft Learn: T-SQL differences between SQL Server and Azure SQL Database: https://learn.microsoft.com/en-us/azure/azure-sql/database/transact-sql-tsql-differences-sql-server
- Microsoft Learn: Get started with cross-database queries in Azure SQL Database: https://learn.microsoft.com/en-us/azure/azure-sql/database/elastic-query-getting-started-vertical
- Microsoft Learn: CREATE EXTERNAL TABLE for elastic query: https://learn.microsoft.com/en-us/sql/t-sql/statements/create-external-table-transact-sql
- Microsoft Learn: jobs.sp_add_jobstep for Azure Elastic Jobs: https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-add-jobstep-elastic-jobs-transact-sql
- Microsoft Learn: SQL Server to Azure SQL Database migration guide: https://learn.microsoft.com/en-us/data-migration/sql-server/database/guide
- Microsoft Learn: Azure Database Migration Service SQL Server to Azure SQL Database offline migration: https://learn.microsoft.com/en-us/azure/dms/tutorial-sql-server-azure-sql-database-offline
- Microsoft Learn: Azure Database Migration Service SQL Server to Azure SQL Managed Instance migration: https://learn.microsoft.com/en-us/azure/dms/tutorial-sql-server-managed-instance-offline-ads
- Azure pricing: Reserved capacity pricing: https://azure.microsoft.com/pricing/reserved-capacity/
- Azure pricing: Azure SQL Database pricing and Azure Hybrid Benefit notes: https://azure.microsoft.com/pricing/details/azure-sql-database/single/

## Issues Found
- Data Migration Assistant was presented as the primary current assessment and migration tool. Microsoft has retired DMA and no longer offers it for download. Updated the guide to use SSMS 22 with the Hybrid and Migration workload, Azure Migrate assessments, and Azure Database Migration Service.
- The post described uploading DMA results directly to Azure Migrate. Updated this to the current Azure Migrate appliance and Azure SQL assessment workflow.
- The prerequisites referenced SQL Server 2005 and a DMA workstation. Updated prerequisites to current SSMS and Azure Migrate requirements.
- The elastic query example referenced a database scoped credential that was never created. Added `CREATE MASTER KEY` and `CREATE DATABASE SCOPED CREDENTIAL` before `CREATE EXTERNAL DATA SOURCE`.
- The migration section described DMA copying schema and data. Replaced it with current SSMS-guided migration, DMS, SQL Managed Instance link, backup/restore, and transactional replication options.
- The online migration explanation incorrectly stated that DMS uses Change Data Capture for the described SQL Server to Azure SQL workflow. Updated it to reflect DMS backup/log backup based online migrations for Azure SQL Managed Instance and SQL Server on Azure VMs, and noted that DMS migrations to Azure SQL Database are offline.
- The cost section claimed Azure SQL reserved capacity can save up to 65%. Updated this to up to 33% for Azure SQL Database compute, with higher combined savings possible when paired with Azure Hybrid Benefit.

## Review Notes
Azure SQL Database elastic query remains in preview in Microsoft documentation. The post's recommendation is technically valid as an option for cross-database query remediation, but production migrations should evaluate preview-feature suitability before relying on it.
