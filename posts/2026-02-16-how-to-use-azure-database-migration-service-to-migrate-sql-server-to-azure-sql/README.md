# How to Use Azure Database Migration Service to Migrate SQL Server to Azure SQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Database Migration, SQL Server, Azure SQL, DMS, Azure Database Migration Service, Cloud Migration

Description: A complete walkthrough of using Azure Database Migration Service to migrate an on-premises SQL Server database to Azure SQL Database.

---

Migrating a SQL Server database to Azure SQL Database is one of the most common cloud migration scenarios. Azure Database Migration Service (DMS) makes this process manageable by handling the heavy lifting of data transfer and, in current portal workflows, schema migration. This guide walks through the end-to-end process of using DMS to move your SQL Server database to Azure SQL.

## What Is Azure Database Migration Service?

Azure Database Migration Service is a fully managed service designed to enable seamless migrations from multiple database sources to Azure data platforms. For SQL Server to Azure SQL Database migrations, it supports:

- **Offline migrations**: Application downtime starts when the migration starts. Simpler to set up, but requires a maintenance window.

Currently, online migrations for Azure SQL Database targets are not available with DMS. This guide focuses on offline migration.

## Prerequisites

Before starting the migration, make sure you have:

- A source SQL Server (2008 or later, on-premises or in a VM)
- An Azure SQL Database target (already created)
- Network connectivity between the source server and Azure (VPN, ExpressRoute, or public internet)
- Azure Database Migration Service instance or permission to create one
- SQL Server Management Studio (SSMS) 22 or Azure Migrate for pre-assessment
- The source database backed up as a precaution

## Step 1: Assess Your Database for Compatibility

Before migrating, check if your database is compatible with Azure SQL Database. Azure SQL does not support everything that on-premises SQL Server does (e.g., cross-database queries, CLR assemblies, some system stored procedures).

Use the migration component in SSMS 22 or Azure Migrate for this assessment. For SSMS:

1. Download and install the latest SSMS.
2. Connect to your source SQL Server.
3. Right-click the SQL Server instance in Object Explorer and select "Migrate SQL Server".
4. Run the database assessment.
5. Review the Azure SQL Database readiness results.

The assessment will report compatibility issues, broken dependencies, and feature parity gaps. Address any blocking issues before proceeding with the migration.

Common issues to look for:
- Cross-database queries (not supported in Azure SQL)
- FILESTREAM usage (not supported)
- SQL Server Agent jobs (need to be migrated to Azure Automation or Elastic Jobs)
- Windows authentication (Azure SQL Database uses SQL authentication or Microsoft Entra authentication)

## Step 2: Create an Azure SQL Database Target

If you do not already have a target database, create one:

```bash
# Create a logical SQL server

az sql server create \
  --name my-azure-sql-server \
  --resource-group rg-migration \
  --location eastus \
  --admin-user sqladmin \
  --admin-password '<StrongPassword123!>'

# Create the target database with the right service tier
az sql db create \
  --name MyAppDB \
  --resource-group rg-migration \
  --server my-azure-sql-server \
  --service-objective S3 \
  --max-size 50GB

# Allow Azure services to access the SQL server
az sql server firewall-rule create \
  --name AllowAzureServices \
  --resource-group rg-migration \
  --server my-azure-sql-server \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

## Step 3: Migrate the Schema

DMS migrates data, but it is best to migrate the schema separately so you can review and adjust it.

Use SSMS to generate the schema script, or use sqlpackage to extract and publish a DACPAC:

**Using SSMS:**
1. Right-click the source database, select Tasks, then Generate Scripts.
2. Choose "Script entire database and all database objects".
3. In the Advanced options, set "Script for Database Engine Type" to "Azure SQL Database".
4. Save the script to a file.
5. Review the script and remove any unsupported features flagged in the assessment.
6. Execute the script against your Azure SQL Database.

**Using sqlpackage (command line):**

```bash
# Export schema from source SQL Server
sqlpackage /Action:Extract \
  /SourceServerName:my-onprem-server \
  /SourceDatabaseName:MyAppDB \
  /TargetFile:MyAppDB.dacpac

# Deploy schema to Azure SQL Database
sqlpackage /Action:Publish \
  /SourceFile:MyAppDB.dacpac \
  /TargetServerName:my-azure-sql-server.database.windows.net \
  /TargetDatabaseName:MyAppDB \
  /TargetUser:sqladmin \
  /TargetPassword:'<StrongPassword123!>'
```

## Step 4: Create the Azure Database Migration Service Instance

```bash
# Create a DMS instance
az dms create \
  --name my-dms-instance \
  --resource-group rg-migration \
  --location eastus \
  --sku-name Basic_2vCores \
  --subnet "/subscriptions/<sub-id>/resourceGroups/rg-migration/providers/Microsoft.Network/virtualNetworks/vnet-migration/subnets/snet-dms"
```

The DMS instance needs to be in a VNet that can reach both the source SQL Server and the target Azure SQL Database. If your source is on-premises, this VNet should be connected via VPN or ExpressRoute.

## Step 5: Create a Migration Project

```bash
# Create a migration project for SQL Server to Azure SQL Database
az dms project create \
  --name sql-to-azure-migration \
  --resource-group rg-migration \
  --location eastus \
  --service-name my-dms-instance \
  --source-platform SQL \
  --target-platform SQLDB
```

## Step 6: Configure and Run the Migration Task

This is where you define the source, target, and which tables to migrate.

**Using the Azure Portal** (recommended for first-time setup):

1. Navigate to your DMS instance in the Azure Portal.
2. Click "New migration".
3. Select the migration project you created.
4. Configure the source connection:
   - Server name: your on-premises SQL Server hostname or IP
   - Authentication: SQL or Windows
   - Database name: the source database
   - Encrypt connection: Yes (recommended)
5. Configure the target connection:
   - Server name: my-azure-sql-server.database.windows.net
   - Authentication: SQL authentication
   - Database name: MyAppDB
6. Map source database to target database.
7. Select the tables to migrate (or select all).
8. Start the offline migration.

**Using Azure CLI for offline migration:**

```bash
# Create and start the migration task
az dms project task create \
  --name migrate-myappdb \
  --resource-group rg-migration \
  --service-name my-dms-instance \
  --project-name sql-to-azure-migration \
  --task-type OfflineMigration \
  --source-connection-json '{
    "dataSource": "my-onprem-server",
    "authentication": "SqlAuthentication",
    "userName": "sa",
    "password": "<source-password>",
    "encryptConnection": true,
    "trustServerCertificate": true
  }' \
  --target-connection-json '{
    "dataSource": "my-azure-sql-server.database.windows.net",
    "authentication": "SqlAuthentication",
    "userName": "sqladmin",
    "password": "<target-password>",
    "encryptConnection": true
  }' \
  --database-options-json '[{
    "name": "MyAppDB",
    "target_database_name": "MyAppDB",
    "table_map": {
      "dbo.Customers": "dbo.Customers",
      "dbo.Orders": "dbo.Orders",
      "dbo.Products": "dbo.Products"
    }
  }]'
```

## Step 7: Monitor the Migration

Track the progress of your migration task:

```bash
# Check the status of the migration task
az dms project task show \
  --name migrate-myappdb \
  --resource-group rg-migration \
  --service-name my-dms-instance \
  --project-name sql-to-azure-migration \
  --query "properties.state"
```

In the Azure Portal, you can see detailed progress including:
- Number of tables migrated
- Rows copied per table
- Errors encountered
- Estimated time remaining

## Step 8: Validate the Migration

After the migration completes, validate the data:

```sql
-- Check row counts match between source and target
-- Run on source:
SELECT 'Customers' AS TableName, COUNT(*) AS RowCount FROM dbo.Customers
UNION ALL
SELECT 'Orders', COUNT(*) FROM dbo.Orders
UNION ALL
SELECT 'Products', COUNT(*) FROM dbo.Products;

-- Run the same on target and compare
```

Also verify:
- Indexes exist on the target (they should if you migrated the schema first)
- Foreign key constraints are in place
- Stored procedures, views, and functions work correctly
- Application connection strings point to the new Azure SQL Database

## Step 9: Cut Over

For an offline DMS migration, your application downtime starts when the migration starts. When the migration is complete:

1. Keep writes stopped on the source database.
2. Verify the target data and schema.
3. Update your application connection string to point to Azure SQL.
4. Resume the application against the target database.

## Post-Migration Tasks

After the migration is complete:

- **Disable the DMS instance** to stop billing if you no longer need it.
- **Configure Azure SQL firewalls** to restrict access appropriately.
- **Set up monitoring** with Azure Monitor or database watcher.
- **Review and tune performance** - Azure SQL might need different indexes or query patterns than on-premises SQL Server.
- **Back up the source database** one final time as an archive.

## Wrapping Up

Azure Database Migration Service streamlines the SQL Server to Azure SQL Database migration path. The key steps are: assess compatibility, migrate the schema, migrate the data with DMS, validate, and cut over. For small to medium databases, offline migration is the simplest approach. For large databases where downtime is not an option, consider transactional replication or another continuous sync approach supported by Azure SQL Database. Either way, always run a compatibility assessment first and test the migration in a non-production environment before doing it for real.
