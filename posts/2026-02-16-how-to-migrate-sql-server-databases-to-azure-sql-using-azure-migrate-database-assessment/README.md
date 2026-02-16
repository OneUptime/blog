# How to Migrate SQL Server Databases to Azure SQL Using Azure Migrate Database Assessment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Migrate, SQL Server, Azure SQL, Database Migration, Cloud Migration, DMA, Assessment

Description: Learn how to assess and migrate on-premises SQL Server databases to Azure SQL using Azure Migrate database assessment tools and Data Migration Assistant.

---

Database migration is often the most nerve-wracking part of moving to the cloud. Get it wrong and your applications break, data gets lost, or performance tanks. Azure Migrate includes database assessment capabilities that analyze your SQL Server databases, flag compatibility issues, and recommend the right Azure SQL target before you move a single row.

This guide covers the full workflow: assessing your databases with the Data Migration Assistant (DMA), uploading results to Azure Migrate for a unified view, and then executing the actual migration.

## Choosing Your Azure SQL Target

Before you assess anything, understand the Azure SQL options available:

**Azure SQL Database** - A fully managed PaaS database engine. Best for applications that can work with a single database and do not need cross-database queries or SQL Server Agent jobs.

**Azure SQL Managed Instance** - Near 100% compatibility with on-premises SQL Server. Supports cross-database queries, SQL Agent, linked servers, and other features that SQL Database does not. This is the closest to a lift-and-shift experience.

**SQL Server on Azure VMs** - Full SQL Server running on an Azure VM. Maximum compatibility since it is the same SQL Server engine. Choose this when you need features like SSIS, SSRS, or third-party software installed alongside SQL Server.

The assessment helps you determine which option fits each database.

## Prerequisites

You need:

- SQL Server 2005 or later running on-premises
- A Windows machine to run the Data Migration Assistant (can be the SQL Server itself or a separate workstation)
- Network connectivity from the DMA machine to both SQL Server and Azure
- An Azure Migrate project in the portal
- An Azure SQL target provisioned (or you can provision one after the assessment)

## Step 1: Install the Data Migration Assistant

Download DMA from Microsoft's website and install it on a Windows machine that can connect to your SQL Server instances.

DMA is a lightweight desktop application. It does not require installation on the SQL Server itself, which is important if your DBAs are protective of production servers.

After installation, open DMA and you will see options to create new assessment or migration projects.

## Step 2: Create a Database Assessment

Click "New" in DMA and configure the assessment:

1. **Project type**: Assessment
2. **Project name**: Give it a meaningful name like "ERP-DB-Assessment"
3. **Assessment type**: Database Engine
4. **Source server type**: SQL Server
5. **Target server type**: Choose Azure SQL Database, Azure SQL Managed Instance, or SQL Server on Azure VM

You can (and should) run separate assessments for each target type. This gives you a comparison of compatibility issues across all options.

Connect to your SQL Server instance:

```
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

DMA also shows features you are using on-premises that have different implementations in Azure SQL. For example, TDE (Transparent Data Encryption) works differently, and Always On availability groups are replaced by Azure SQL's built-in high availability.

## Step 4: Upload Assessment to Azure Migrate

DMA can push assessment results directly to your Azure Migrate project, giving you a unified view of server and database readiness.

1. In DMA, go to the assessment results
2. Click "Upload to Azure Migrate"
3. Sign in with your Azure credentials
4. Select the Azure Migrate project
5. Click "Upload"

Now when you look at Azure Migrate in the portal, the database assessment data appears alongside server assessment data. This is valuable for understanding the full picture - for example, seeing that a VM is ready for migration but the database it hosts has blocking issues.

## Step 5: Fix Compatibility Issues

Before migrating, address any blocking issues identified in the assessment. Here are solutions for common problems:

For cross-database queries, consolidate the databases or use elastic queries in Azure SQL Database:

```sql
-- Before migration: cross-database query (not supported in Azure SQL DB)
-- SELECT * FROM OtherDB.dbo.Customers WHERE Active = 1

-- After migration: use elastic query with an external data source
-- First, create an external data source pointing to the other database
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

Once compatibility issues are resolved, you can migrate using DMA (for smaller databases) or Azure Database Migration Service (for larger or more complex scenarios).

For a DMA migration:

1. Create a new DMA project with type "Migration"
2. Connect to the source SQL Server
3. Connect to the target Azure SQL instance
4. Select databases to migrate
5. Select objects to include (tables, views, stored procedures, etc.)
6. Click "Start Migration"

DMA generates and executes the schema on the target, then copies the data. For a database with a few GB of data, this can complete in minutes. For larger databases, consider using the Azure Database Migration Service (DMS) which supports online migration with minimal downtime.

### Online vs. Offline Migration

**Offline migration** is simpler. The source database should be read-only during migration. Downtime equals the time to copy all data plus verification.

**Online migration** (via DMS) uses Change Data Capture to continuously replicate changes from source to target. You can keep the source database live during migration and only cut over when the target is caught up. This reduces downtime to minutes.

For production databases, online migration is almost always the right choice.

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

- **Reserved capacity** - Commit to 1 or 3 years for up to 65% savings
- **Azure Hybrid Benefit** - Use existing SQL Server licenses to save up to 55%
- **Serverless compute tier** - For databases with intermittent usage patterns
- **Elastic pools** - Share resources across multiple databases with variable workloads

## Wrapping Up

Database migration to Azure SQL does not have to be a leap of faith. The assessment phase with DMA tells you exactly what will work, what will not, and what needs fixing before you move. Upload the results to Azure Migrate for a complete picture alongside your server assessments. Fix the compatibility issues, run the migration, validate thoroughly, and you will have your databases running in Azure with the confidence that nothing was missed.
