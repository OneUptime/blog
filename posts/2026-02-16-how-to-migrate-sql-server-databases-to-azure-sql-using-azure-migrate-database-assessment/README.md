# How to Migrate SQL Server Databases to Azure SQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Migrate, SQL Server, Azure SQL, Database Migration, Cloud Migration, DMA, Assessment

Description: Learn how to assess and migrate on-premises SQL Server databases to Azure SQL using Azure Migrate database assessment tools and Data Migration Assistant.

---

Database migration is often the most nerve-wracking part of moving to the cloud. Get it wrong and your applications break, data gets lost, or performance tanks. Azure Migrate includes database assessment capabilities that analyze your SQL Server databases, flag compatibility issues, and recommend the right Azure SQL target before you move a single row.

This guide covers the full workflow: assessing your databases with Azure Migrate or the migration component in SQL Server Management Studio (SSMS), reviewing readiness in Azure Migrate for a unified view, and then executing the actual migration.

## Choosing Your Azure SQL Target

Before you assess anything, understand the Azure SQL options available:

**Azure SQL Database** - A fully managed PaaS database engine. Best for applications that can work with a single database and do not need cross-database queries or SQL Server Agent jobs.

**Azure SQL Managed Instance** - Near 100% compatibility with on-premises SQL Server. Supports cross-database queries, SQL Agent, linked servers, and other features that SQL Database does not. This is the closest to a lift-and-shift experience.

**SQL Server on Azure VMs** - Full SQL Server running on an Azure VM. Maximum compatibility since it is the same SQL Server engine. Choose this when you need features like SSIS, SSRS, or third-party software installed alongside SQL Server.

The assessment helps you determine which option fits each database.

## Prerequisites

You need:

- SQL Server 2012 or later running on-premises
- SQL Server Management Studio 22 or later with the Hybrid and Migration workload installed
- Network connectivity from the assessment machine to both SQL Server and Azure
- An Azure Migrate project in the portal and, for Azure Migrate assessments, an Azure Migrate appliance configured for your VMware, Hyper-V, or physical environment
- An Azure SQL target provisioned (or you can provision one after the assessment)

## Step 1: Install SQL Server Management Studio

Download the latest SSMS and install it on a Windows machine that can connect to your SQL Server instances.

SSMS does not require installation on the SQL Server itself, which is important if your DBAs are protective of production servers. During installation, select the Hybrid and Migration workload so the SQL Server migration component is available.

After installation, open SSMS, connect to your source SQL Server instance, and right-click the instance in Object Explorer to start the Migrate SQL Server workflow.

## Step 2: Create a Database Assessment

In SSMS, right-click the source SQL Server instance and select "Migrate SQL Server." The workflow opens on the Database Assessment phase:

1. **Assessment action**: Run Assessment
2. **Source server type**: SQL Server
3. **Assessment scope**: Select the databases you want to assess
4. **Target review**: Review readiness for Azure SQL Database, Azure SQL Managed Instance, and SQL Server on Azure VM
5. **Recommendation**: Review the recommended Azure SQL deployment type and sizing guidance

You can also create an Azure SQL assessment in Azure Migrate after the Azure Migrate appliance discovers your SQL Server instances. This gives you a comparison of readiness, sizing, and cost estimates across all options.

Connect to your SQL Server instance:

```text
Server name: your-sql-server.domain.local
Authentication: Windows Authentication (or SQL Authentication)
Connection properties: Encrypt connection = True, Trust server certificate = True
```

Select the databases you want to assess. You can select multiple databases in a single assessment.

## Step 3: Review Assessment Results

The assessment runs quickly - usually a few seconds to a few minutes depending on database complexity. Results are organized into two categories:

### Compatibility Issues

These are features or syntax in your database that the target Azure SQL service does not support. Each issue includes:

- **Description** of the problem
- **Affected objects** (stored procedures, tables, views, etc.)
- **Recommendation** for how to fix it
- **Impact level** (blocking or warning)

Common issues when targeting Azure SQL Database include:

- Cross-database queries (not supported in SQL Database)
- CLR assemblies with EXTERNAL_ACCESS or UNSAFE permissions
- SQL Server Agent jobs (no agent in SQL Database)
- Linked servers
- Service Broker across instances
- FILESTREAM data

For Azure SQL Managed Instance, the list is much shorter because MI supports most SQL Server features. Typical issues are limited to:

- Cross-instance distributed transactions
- Some CLR configurations
- Certain trace flags

### Feature Parity

The assessment also shows features you are using on-premises that have different implementations in Azure SQL. For example, TDE (Transparent Data Encryption) works differently, and Always On availability groups are replaced by Azure SQL's built-in high availability.

## Step 4: Review Assessment in Azure Migrate

Azure Migrate can discover SQL Server instances through the Azure Migrate appliance and create Azure SQL assessments, giving you a unified view of server and database readiness.

1. In the Azure portal, open your Azure Migrate project
2. Make sure the Azure Migrate: Discovery and assessment tool is added
3. Confirm that your appliance has discovered the SQL Server instances
4. Create an Azure SQL assessment
5. Review the readiness, recommended deployment type, sizing, and monthly cost estimates

Now when you look at Azure Migrate in the portal, the database assessment data appears alongside server assessment data. This is valuable for understanding the full picture - for example, seeing that a VM is ready for migration but the database it hosts has blocking issues.

## Step 5: Fix Compatibility Issues

Before migrating, address any blocking issues identified in the assessment. Here are solutions for common problems:

For cross-database queries, consolidate the databases or use elastic queries in Azure SQL Database:

```sql
-- Before migration: cross-database query (not supported in Azure SQL DB)
-- SELECT * FROM OtherDB.dbo.Customers WHERE Active = 1

-- After migration: use elastic query with an external data source
-- First, create a database scoped credential and external data source
CREATE MASTER KEY ENCRYPTION BY PASSWORD = '<strong-password>';

CREATE DATABASE SCOPED CREDENTIAL OtherDB_Credential
WITH IDENTITY = '<sql-user>',
SECRET = '<sql-password>';

CREATE EXTERNAL DATA SOURCE OtherDB_Source
WITH (
    TYPE = RDBMS,
    -- Connection string to the external Azure SQL Database
    LOCATION = 'other-server.database.windows.net',
    DATABASE_NAME = 'OtherDB',
    CREDENTIAL = OtherDB_Credential
);

-- Create an external table that maps to the remote table
CREATE EXTERNAL TABLE dbo.Customers_Remote (
    CustomerID INT,
    CustomerName NVARCHAR(100),
    Active BIT
)
WITH (
    DATA_SOURCE = OtherDB_Source,
    SCHEMA_NAME = 'dbo',
    OBJECT_NAME = 'Customers'
);

-- Now query the external table instead
SELECT * FROM dbo.Customers_Remote WHERE Active = 1;
```

For SQL Agent jobs, migrate them to Azure Data Factory, Azure Automation, or Elastic Jobs:

```sql
-- Example: Convert a SQL Agent maintenance job to an Elastic Job
-- This runs index maintenance on a schedule via Azure Elastic Jobs

-- Step 1: Create the job in Elastic Jobs (via Azure portal or T-SQL)
-- Step 2: Define the job step with your maintenance script
EXEC jobs.sp_add_jobstep
    @job_name = 'IndexMaintenance',
    @step_name = 'RebuildIndexes',
    @command = N'
        -- Rebuild all indexes with more than 30% fragmentation
        DECLARE @sql NVARCHAR(MAX) = ''''
        SELECT @sql = @sql + ''ALTER INDEX '' + i.name + '' ON '' +
            OBJECT_SCHEMA_NAME(i.object_id) + ''.'' + OBJECT_NAME(i.object_id) +
            '' REBUILD;'' + CHAR(13)
        FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, ''LIMITED'') ps
        JOIN sys.indexes i ON ps.object_id = i.object_id AND ps.index_id = i.index_id
        WHERE ps.avg_fragmentation_in_percent > 30
        EXEC sp_executesql @sql
    ',
    @target_group_name = 'MyDatabaseGroup';
```

## Step 6: Execute the Migration

Once compatibility issues are resolved, you can migrate using the SSMS migration component, native backup and restore, SQL Managed Instance link, transactional replication, or Azure Database Migration Service depending on the target and downtime requirements.

For an SSMS-guided migration:

1. Right-click the source SQL Server instance in SSMS and select "Migrate SQL Server"
2. Review or run the readiness assessment
3. Provision or select the target Azure SQL resource
4. Choose the migration method that fits the target
5. Start the migration and monitor progress
6. Perform cutover when the target is synchronized and validation passes

For larger databases or enterprise migration waves, consider Azure Database Migration Service (DMS). DMS supports offline migrations to Azure SQL Database and offline or online migrations for Azure SQL Managed Instance and SQL Server on Azure VMs.

### Online vs. Offline Migration

**Offline migration** is simpler. The source database should be read-only during migration. Downtime equals the time to copy all data plus verification.

**Online migration** depends on the target. For Azure SQL Managed Instance and SQL Server on Azure VMs, DMS can continuously restore backups and transaction log backups while the source stays online. For Azure SQL Database, DMS migrations are offline; if you need continuous synchronization, use SQL Server transactional replication.

For production databases with tight downtime requirements, online migration or transactional replication is usually the right choice.

## Step 7: Validate After Migration

After the migration completes, run these validation checks:

1. **Row counts** - Compare row counts for all tables between source and target
2. **Checksum validation** - Run CHECKSUM_AGG on critical tables to verify data integrity
3. **Application testing** - Point your application at the Azure SQL database and run through key workflows
4. **Performance testing** - Run your typical query workload and compare execution times
5. **Security validation** - Verify users, roles, and permissions were migrated correctly

```sql
-- Quick validation: compare row counts for all tables
-- Run on both source and target, then compare results
SELECT
    SCHEMA_NAME(t.schema_id) AS SchemaName,
    t.name AS TableName,
    SUM(p.rows) AS RowCount
FROM sys.tables t
JOIN sys.partitions p ON t.object_id = p.object_id
WHERE p.index_id IN (0, 1) -- heap or clustered index
GROUP BY t.schema_id, t.name
ORDER BY t.name;
```

## Cost Optimization Tips

After migration, take advantage of Azure SQL cost optimization features:

- **Reserved capacity** - Commit to 1 or 3 years for up to 33% savings on Azure SQL Database compute, or more when combined with Azure Hybrid Benefit
- **Azure Hybrid Benefit** - Use existing SQL Server licenses to save up to 55%
- **Serverless compute tier** - For databases with intermittent usage patterns
- **Elastic pools** - Share resources across multiple databases with variable workloads

## Wrapping Up

Database migration to Azure SQL does not have to be a leap of faith. The assessment phase with Azure Migrate or SSMS tells you exactly what will work, what will not, and what needs fixing before you move. Review the results in Azure Migrate for a complete picture alongside your server assessments. Fix the compatibility issues, run the migration, validate thoroughly, and you will have your databases running in Azure with the confidence that nothing was missed.
